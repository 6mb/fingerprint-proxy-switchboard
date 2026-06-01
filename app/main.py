from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlsplit

import httpx
from fastapi import Cookie, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yaml

from .config_builder import ConfigError, summarize_sources, write_mihomo_config
from .mihomo_client import MihomoClient
from .settings import Settings, load_settings


APP_ROOT = Path(__file__).resolve().parent
STATIC_ROOT = APP_ROOT / "static"

app = FastAPI(title="Fingerprint Proxy Switchboard")
app.mount("/static", StaticFiles(directory=STATIC_ROOT, check_dir=False), name="static")


@app.middleware("http")
async def no_cache_panel(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return response


class LoginRequest(BaseModel):
    token: str


class SelectRequest(BaseModel):
    name: str


class DelayRequest(BaseModel):
    name: str


class DelayBatchRequest(BaseModel):
    names: Optional[list[str]] = None


class SourceEntryRequest(BaseModel):
    id: Optional[int] = None
    name: str
    kind: str
    value: str = ""
    enabled: bool = True
    keep: bool = False


class SourcesRequest(BaseModel):
    sources: list[SourceEntryRequest]
    reload: bool = False


DELAY_CACHE: dict[str, dict[str, Any]] = {}


def settings() -> Settings:
    return load_settings()


def mihomo() -> MihomoClient:
    cfg = settings()
    return MihomoClient(cfg.mihomo_api, cfg.mihomo_secret)


def token_valid(request: Request, fp_panel_token: Optional[str] = Cookie(default=None)) -> bool:
    cfg = settings()
    if not cfg.panel_token:
        return True
    presented = request.headers.get("x-panel-token") or fp_panel_token or ""
    return presented == cfg.panel_token


def require_auth(request: Request, fp_panel_token: Optional[str] = Cookie(default=None)) -> None:
    if not token_valid(request, fp_panel_token):
        raise HTTPException(status_code=401, detail="unauthorized")


def request_public_host(request: Request, cfg: Settings) -> str:
    return cfg.public_host or request.url.hostname or "127.0.0.1"


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _redact_url(url: str) -> str:
    try:
        parsed = urlsplit(url)
    except ValueError:
        return "<已保存>"
    if not parsed.scheme or not parsed.netloc:
        return "<已保存>"
    tail = Path(parsed.path).name
    suffix = f"/.../{tail}" if tail else "/..."
    return f"{parsed.scheme}://{parsed.netloc}{suffix}"


def _source_slug(name: str, index: int) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", name.strip()).strip("-").lower()
    return slug or f"source-{index + 1}"


def _read_sources_raw(cfg: Settings) -> list[dict[str, Any]]:
    if not cfg.sources_path.exists():
        return [{"name": cfg.source_path.stem, "path": str(cfg.source_path), "enabled": True}]
    data = yaml.safe_load(cfg.sources_path.read_text(encoding="utf-8")) or {}
    raw = data.get("sources") or []
    if not isinstance(raw, list):
        raise ConfigError("sources.yaml must contain a sources list")
    return [item for item in raw if isinstance(item, dict)]


def _source_kind_and_value(item: dict[str, Any]) -> tuple[str, str]:
    if item.get("path"):
        return "path", str(item.get("path") or "")
    if item.get("url_file"):
        return "url", str(item.get("url_file") or "")
    if item.get("url"):
        return "url", str(item.get("url") or "")
    return "path", ""


def _source_preview(kind: str, value: str) -> str:
    if kind != "url":
        return value
    if value.startswith("http://") or value.startswith("https://"):
        return _redact_url(value)
    try:
        url = Path(value).read_text(encoding="utf-8").strip()
    except OSError:
        return "<URL 文件>"
    return _redact_url(url)


def _source_response(item: dict[str, Any], index: int) -> dict[str, Any]:
    kind, value = _source_kind_and_value(item)
    is_url = kind == "url"
    return {
        "id": index,
        "name": str(item.get("name") or f"source-{index + 1}"),
        "kind": kind,
        "value": "" if is_url else value,
        "preview": _source_preview(kind, value),
        "enabled": item.get("enabled", True) is not False,
        "saved": is_url,
    }


def _write_secret_file(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(value.strip() + "\n", encoding="utf-8")
    tmp_path.chmod(0o600)
    tmp_path.replace(path)


def _entry_to_source(entry: SourceEntryRequest, old_sources: list[dict[str, Any]], index: int) -> Optional[dict[str, Any]]:
    name = entry.name.strip() or f"source-{index + 1}"
    kind = entry.kind.strip()
    value = entry.value.strip()
    old: dict[str, Any] = {}
    if entry.id is not None and 0 <= entry.id < len(old_sources):
        old = old_sources[entry.id]

    if kind == "path":
        if not value:
            return None
        source = {"name": name, "path": value}
    elif kind == "url":
        if not value:
            if entry.keep and old:
                source = dict(old)
                source["name"] = name
            else:
                return None
        else:
            if not value.startswith(("http://", "https://")):
                raise ConfigError(f"{name}: 订阅链接必须以 http:// 或 https:// 开头")
            url_path = Path("/app/config/subscriptions") / f"{_source_slug(name, index)}.url"
            _write_secret_file(url_path, value)
            source = {"name": name, "url_file": str(url_path)}
    elif kind == "url_file":
        if not value:
            return None
        source = {"name": name, "url_file": value}
    else:
        raise ConfigError(f"{name}: 不支持的订阅类型")

    if not entry.enabled:
        source["enabled"] = False
    return source


def _write_sources(cfg: Settings, entries: list[SourceEntryRequest]) -> dict[str, Any]:
    old_sources = _read_sources_raw(cfg)
    sources: list[dict[str, Any]] = []
    for index, entry in enumerate(entries):
        source = _entry_to_source(entry, old_sources, index)
        if source:
            sources.append(source)
    if not sources:
        raise ConfigError("至少保留一个订阅源")
    cfg.sources_path.parent.mkdir(parents=True, exist_ok=True)
    cfg.sources_path.parent.chmod(0o700)
    tmp_path = cfg.sources_path.with_suffix(cfg.sources_path.suffix + ".tmp")
    tmp_path.write_text(
        yaml.safe_dump({"sources": sources}, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    tmp_path.chmod(0o600)
    tmp_path.replace(cfg.sources_path)
    return {"count": len(sources)}


def _latest_history_delay(proxy: dict[str, Any]) -> Optional[int]:
    history = proxy.get("history") or []
    if not isinstance(history, list):
        return None
    for item in reversed(history):
        if not isinstance(item, dict):
            continue
        delay = item.get("delay")
        if isinstance(delay, int) and delay > 0:
            return delay
    return None


def _node_state(name: str, proxy: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    cached = DELAY_CACHE.get(name) or {}
    history_delay = _latest_history_delay(proxy)
    delay = cached.get("delay")
    if delay is None:
        delay = history_delay

    status = cached.get("status")
    if not status:
        if isinstance(delay, int):
            status = "ok"
        elif proxy.get("alive") is False:
            status = "down"
        else:
            status = "untested"

    return {
        "name": name,
        "type": proxy.get("type") or metadata.get("type") or "",
        "source": metadata.get("source", ""),
        "country": metadata.get("country") or {"code": "OTHER", "name": "其他地区"},
        "delay": delay,
        "status": status,
        "updatedAt": cached.get("updatedAt"),
        "error": cached.get("error", ""),
    }


def slot_payload(group_name: str, port: int, proxies: dict[str, Any], host: str, node_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    group = proxies.get(group_name) or {}
    choices = group.get("all") or []
    selected = group.get("now") or (choices[0] if choices else "")
    choice_details = [node_map[name] for name in choices if name in node_map]
    return {
        "id": int(group_name.rsplit("-", 1)[-1]),
        "name": group_name,
        "port": port,
        "selected": selected,
        "selectedNode": node_map.get(selected),
        "choices": choices,
        "choiceDetails": choice_details,
        "http": f"http://{host}:{port}",
        "socks5": f"socks5://{host}:{port}",
    }


async def test_node_delay(client: MihomoClient, name: str, delay_url: str) -> dict[str, Any]:
    try:
        result = await client.delay(name, delay_url)
        delay = result.get("delay")
        if isinstance(delay, int) and delay > 0:
            state = {"name": name, "delay": delay, "status": "ok", "updatedAt": _utc_now(), "error": ""}
        else:
            state = {"name": name, "delay": None, "status": "error", "updatedAt": _utc_now(), "error": "no delay returned"}
    except httpx.HTTPError as exc:
        state = {"name": name, "delay": None, "status": "error", "updatedAt": _utc_now(), "error": str(exc)[:180]}
    DELAY_CACHE[name] = state
    return state


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/session")
async def session(request: Request, fp_panel_token: Optional[str] = Cookie(default=None)) -> dict[str, Any]:
    cfg = settings()
    return {
        "authRequired": bool(cfg.panel_token),
        "authenticated": token_valid(request, fp_panel_token),
    }


@app.post("/api/login")
async def login(payload: LoginRequest, response: Response) -> dict[str, bool]:
    cfg = settings()
    if cfg.panel_token and payload.token != cfg.panel_token:
        raise HTTPException(status_code=401, detail="unauthorized")
    response.set_cookie(
        "fp_panel_token",
        payload.token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=86400 * 30,
    )
    return {"ok": True}


@app.post("/api/logout")
async def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie("fp_panel_token")
    return {"ok": True}


@app.get("/api/sources")
async def get_sources(request: Request, fp_panel_token: Optional[str] = Cookie(default=None)) -> dict[str, Any]:
    require_auth(request, fp_panel_token)
    cfg = settings()
    try:
        sources = _read_sources_raw(cfg)
    except (ConfigError, OSError, yaml.YAMLError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "sources": [_source_response(item, index) for index, item in enumerate(sources)],
        "sourcesPath": str(cfg.sources_path),
    }


@app.post("/api/sources")
async def save_sources(
    payload: SourcesRequest,
    request: Request,
    fp_panel_token: Optional[str] = Cookie(default=None),
) -> dict[str, Any]:
    require_auth(request, fp_panel_token)
    cfg = settings()
    try:
        saved = _write_sources(cfg, payload.sources)
        generated: Optional[dict[str, Any]] = None
        if payload.reload:
            generated = write_mihomo_config(cfg)
            await mihomo().reload_config(cfg.mihomo_config_path)
    except ConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"mihomo reload failed: {exc}") from exc
    return {"ok": True, "saved": saved, "generated": generated}


@app.get("/api/status")
async def status(request: Request, fp_panel_token: Optional[str] = Cookie(default=None)) -> dict[str, Any]:
    require_auth(request, fp_panel_token)
    cfg = settings()
    client = mihomo()
    try:
        proxies = await client.proxies()
        version = await client.version()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"mihomo api unavailable: {exc}") from exc

    source_summary: dict[str, Any] = {}
    try:
        source_summary = summarize_sources(cfg, prefer_cache=True)
    except (ConfigError, OSError):
        source_summary = {}

    metadata = source_summary.get("items") or []
    node_map = {
        item["name"]: _node_state(item["name"], proxies.get(item["name"]) or {}, item)
        for item in metadata
    }
    host = request_public_host(request, cfg)
    slots = [
        slot_payload(group, port, proxies, host, node_map)
        for group, port in zip(cfg.slot_groups, cfg.slot_ports)
    ]
    return {
        "version": version,
        "slots": slots,
        "nodes": list(node_map.values()),
        "auth": {
            "proxyAuthConfigured": bool(cfg.proxy_auth),
            "proxyUsername": cfg.proxy_auth.split(":", 1)[0] if ":" in cfg.proxy_auth else "",
            "panelAuthRequired": bool(cfg.panel_token),
        },
        "source": {
            "nodeCount": source_summary.get("nodes", 0),
            "types": source_summary.get("types", []),
            "countries": source_summary.get("countries", []),
            "sources": source_summary.get("sources", []),
            "errors": source_summary.get("source_errors", []),
        },
    }


@app.post("/api/slots/{slot_id}/select")
async def select_slot(
    slot_id: int,
    payload: SelectRequest,
    request: Request,
    fp_panel_token: Optional[str] = Cookie(default=None),
) -> dict[str, Any]:
    require_auth(request, fp_panel_token)
    cfg = settings()
    if slot_id < 1 or slot_id > len(cfg.slot_groups):
        raise HTTPException(status_code=404, detail="slot not found")
    group = cfg.slot_groups[slot_id - 1]
    client = mihomo()
    proxies = await client.proxies()
    choices = (proxies.get(group) or {}).get("all") or []
    if payload.name not in choices:
        raise HTTPException(status_code=400, detail="node is not available in this slot")
    await client.select(group, payload.name)
    return {"ok": True, "slot": slot_id, "selected": payload.name}


@app.post("/api/delay")
async def delay(
    payload: DelayRequest,
    request: Request,
    fp_panel_token: Optional[str] = Cookie(default=None),
) -> dict[str, Any]:
    require_auth(request, fp_panel_token)
    cfg = settings()
    try:
        proxies = await mihomo().proxies()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"mihomo api unavailable: {exc}") from exc
    if payload.name not in proxies:
        raise HTTPException(status_code=404, detail="node not found")
    result = await test_node_delay(mihomo(), payload.name, cfg.delay_url)
    return {"ok": result["status"] == "ok", **result}


@app.post("/api/delays")
async def delays(
    payload: DelayBatchRequest,
    request: Request,
    fp_panel_token: Optional[str] = Cookie(default=None),
) -> dict[str, Any]:
    require_auth(request, fp_panel_token)
    cfg = settings()
    try:
        proxies = await mihomo().proxies()
        source_summary = summarize_sources(cfg, prefer_cache=True)
    except ConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"mihomo api unavailable: {exc}") from exc

    known_names = [item["name"] for item in source_summary.get("items", [])]
    requested = payload.names or known_names
    names = [name for name in requested if name in proxies and name in known_names]
    semaphore = asyncio.Semaphore(8)
    client = mihomo()

    async def run_one(name: str) -> dict[str, Any]:
        async with semaphore:
            return await test_node_delay(client, name, cfg.delay_url)

    results = await asyncio.gather(*(run_one(name) for name in names))
    ok_count = sum(1 for item in results if item.get("status") == "ok")
    return {"ok": True, "tested": len(results), "healthy": ok_count, "results": results}


@app.post("/api/reload")
async def reload_config(request: Request, fp_panel_token: Optional[str] = Cookie(default=None)) -> dict[str, Any]:
    require_auth(request, fp_panel_token)
    cfg = settings()
    try:
        generated = write_mihomo_config(cfg)
        await mihomo().reload_config(cfg.mihomo_config_path)
    except ConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"mihomo reload failed: {exc}") from exc
    return {"ok": True, "generated": generated}


@app.get("/api/export", response_class=PlainTextResponse)
async def export_endpoints(request: Request, fp_panel_token: Optional[str] = Cookie(default=None)) -> str:
    require_auth(request, fp_panel_token)
    cfg = settings()
    host = request_public_host(request, cfg)
    lines = ["Fingerprint browser proxy slots", ""]
    for index, port in enumerate(cfg.slot_ports, start=1):
        lines.append(f"Slot {index}: HTTP http://{host}:{port}")
        lines.append(f"Slot {index}: SOCKS5 socks5://{host}:{port}")
    if cfg.proxy_auth:
        lines.append("")
        lines.append("Proxy authentication is enabled. Read the deployment .env for the password.")
    return "\n".join(lines) + "\n"


def frontend_index() -> FileResponse:
    index_path = STATIC_ROOT / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=503, detail="frontend assets not built")
    return FileResponse(index_path)


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return frontend_index()


@app.get("/{full_path:path}", include_in_schema=False)
async def spa(full_path: str) -> FileResponse:
    if full_path.startswith(("api/", "static/")) or full_path in {"api", "static", "healthz"}:
        raise HTTPException(status_code=404, detail="not found")
    return frontend_index()
