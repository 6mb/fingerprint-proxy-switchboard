from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Optional
import yaml

from .settings import Settings


class ConfigError(RuntimeError):
    pass


COUNTRY_LABELS = {
    "AE": "阿联酋",
    "AL": "阿尔巴尼亚",
    "AO": "安哥拉",
    "AR": "阿根廷",
    "AT": "奥地利",
    "AU": "澳大利亚",
    "BD": "孟加拉",
    "BE": "比利时",
    "BG": "保加利亚",
    "BO": "玻利维亚",
    "BR": "巴西",
    "BY": "白俄罗斯",
    "CA": "加拿大",
    "CH": "瑞士",
    "CL": "智利",
    "CN": "中国",
    "CO": "哥伦比亚",
    "DE": "德国",
    "DK": "丹麦",
    "EG": "埃及",
    "ES": "西班牙",
    "FI": "芬兰",
    "FR": "法国",
    "GB": "英国",
    "GR": "希腊",
    "HK": "香港",
    "HU": "匈牙利",
    "ID": "印度尼西亚",
    "IL": "以色列",
    "IN": "印度",
    "IT": "意大利",
    "JP": "日本",
    "KE": "肯尼亚",
    "KG": "吉尔吉斯斯坦",
    "KH": "柬埔寨",
    "KR": "韩国",
    "KZ": "哈萨克斯坦",
    "LT": "立陶宛",
    "MO": "澳门",
    "MX": "墨西哥",
    "MY": "马来西亚",
    "NG": "尼日利亚",
    "NL": "荷兰",
    "NO": "挪威",
    "NZ": "新西兰",
    "PE": "秘鲁",
    "PH": "菲律宾",
    "PK": "巴基斯坦",
    "PL": "波兰",
    "PT": "葡萄牙",
    "RO": "罗马尼亚",
    "RU": "俄罗斯",
    "SA": "沙特阿拉伯",
    "SE": "瑞典",
    "SG": "新加坡",
    "TH": "泰国",
    "TR": "土耳其",
    "TW": "台湾",
    "UA": "乌克兰",
    "US": "美国",
    "UZ": "乌兹别克斯坦",
    "VN": "越南",
    "ZA": "南非",
}

COUNTRY_PATTERNS = [
    ("HK", COUNTRY_LABELS["HK"], ["HK", "HKG", "Hong Kong", "香港"]),
    ("US", COUNTRY_LABELS["US"], ["US", "USA", "United States", "America", "美国"]),
    ("JP", COUNTRY_LABELS["JP"], ["JP", "JPN", "Japan", "Tokyo", "Osaka", "日本"]),
    ("SG", COUNTRY_LABELS["SG"], ["SG", "SGP", "Singapore", "新加坡"]),
    ("TW", COUNTRY_LABELS["TW"], ["TW", "TWN", "Taiwan", "台湾", "台灣"]),
    ("KR", COUNTRY_LABELS["KR"], ["KR", "KOR", "Korea", "Seoul", "韩国", "韓國"]),
    ("GB", COUNTRY_LABELS["GB"], ["UK", "GB", "GBR", "United Kingdom", "London", "英国", "英國"]),
    ("DE", COUNTRY_LABELS["DE"], ["DE", "DEU", "Germany", "Frankfurt", "德国", "德國"]),
    ("FR", COUNTRY_LABELS["FR"], ["FR", "FRA", "France", "Paris", "法国", "法國"]),
    ("NL", COUNTRY_LABELS["NL"], ["NL", "NLD", "Netherlands", "荷兰", "荷蘭"]),
    ("CA", COUNTRY_LABELS["CA"], ["CA", "CAN", "Canada", "加拿大"]),
    ("AU", COUNTRY_LABELS["AU"], ["AU", "AUS", "Australia", "Sydney", "澳大利亚", "澳洲"]),
    ("IN", COUNTRY_LABELS["IN"], ["IN", "IND", "India", "印度"]),
    ("TR", COUNTRY_LABELS["TR"], ["TR", "TUR", "Turkey", "土耳其"]),
    ("TH", COUNTRY_LABELS["TH"], ["TH", "THA", "Thailand", "泰国", "泰國"]),
    ("VN", COUNTRY_LABELS["VN"], ["VN", "VNM", "Vietnam", "越南"]),
    ("MY", COUNTRY_LABELS["MY"], ["MY", "MYS", "Malaysia", "马来西亚", "馬來西亞"]),
    ("ID", COUNTRY_LABELS["ID"], ["ID", "IDN", "Indonesia", "印尼", "印度尼西亚"]),
    ("PH", COUNTRY_LABELS["PH"], ["PH", "PHL", "Philippines", "菲律宾", "菲律賓"]),
    ("BR", COUNTRY_LABELS["BR"], ["BR", "BRA", "Brazil", "巴西"]),
    ("AR", COUNTRY_LABELS["AR"], ["AR", "ARG", "Argentina", "阿根廷"]),
    ("IT", COUNTRY_LABELS["IT"], ["IT", "ITA", "Italy", "Milan", "意大利"]),
    ("ES", COUNTRY_LABELS["ES"], ["ES", "ESP", "Spain", "Madrid", "西班牙"]),
    ("SE", COUNTRY_LABELS["SE"], ["SE", "SWE", "Sweden", "瑞典"]),
    ("PL", COUNTRY_LABELS["PL"], ["PL", "POL", "Poland", "波兰", "波蘭"]),
    ("RU", COUNTRY_LABELS["RU"], ["RU", "RUS", "Russia", "俄罗斯", "俄羅斯"]),
    ("UA", COUNTRY_LABELS["UA"], ["UA", "UKR", "Ukraine", "乌克兰", "烏克蘭"]),
    ("ZA", COUNTRY_LABELS["ZA"], ["ZA", "ZAF", "South Africa", "南非"]),
]

SUBSCRIPTION_HEADER_ATTEMPTS = [
    (
        "mihomo",
        {
            "User-Agent": "mihomo/1.18.0",
            "Accept": "*/*",
        },
    ),
    (
        "clash",
        {
            "User-Agent": "ClashforWindows/0.20.39",
            "Accept": "*/*",
        },
    ),
    (
        "clash-meta",
        {
            "User-Agent": "clash-meta",
            "Accept": "*/*",
        },
    ),
    (
        "browser",
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    ),
]


def _load_yaml_text(text: str) -> dict[str, Any]:
    try:
        data = yaml.safe_load(text) or {}
    except yaml.YAMLError as exc:
        raise ConfigError(f"source yaml parse failed: {exc}") from exc
    if not isinstance(data, dict):
        raise ConfigError("source yaml must be a mapping")
    return data


def _safe_file_part(value: str) -> str:
    safe = re.sub(r"[^0-9A-Za-z._-]+", "-", value.strip()).strip("-").lower()
    return safe or "source"


def _write_subscription_cache(cache_path: Optional[Path], text: str) -> None:
    if cache_path is None:
        return
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.parent.chmod(0o700)
    tmp_path = cache_path.with_suffix(cache_path.suffix + ".tmp")
    tmp_path.write_text(text, encoding="utf-8")
    tmp_path.chmod(0o600)
    tmp_path.replace(cache_path)


def _read_subscription_cache(cache_path: Optional[Path]) -> Optional[dict[str, Any]]:
    if cache_path is None or not cache_path.exists():
        return None
    return _load_yaml_text(cache_path.read_text(encoding="utf-8"))


def _subscription_cache_path(settings: Settings, source_name: str, url: str) -> Path:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]
    return settings.sources_path.parent / "subscription-cache" / f"{_safe_file_part(source_name)}-{digest}.yaml"


def _catalog_path(settings: Settings) -> Path:
    return settings.output_path.with_name("catalog.json")


def _read_url(url: str, cache_path: Optional[Path] = None) -> dict[str, Any]:
    import httpx

    attempts: list[str] = []
    with httpx.Client(timeout=25, follow_redirects=True) as client:
        for label, headers in SUBSCRIPTION_HEADER_ATTEMPTS:
            try:
                response = client.get(url, headers=headers)
            except httpx.HTTPError as exc:
                attempts.append(f"{label}: {exc.__class__.__name__}")
                continue
            if response.status_code < 400:
                data = _load_yaml_text(response.text)
                _write_subscription_cache(cache_path, response.text)
                return data
            attempts.append(f"{label}: HTTP {response.status_code}")
            if response.status_code == 429 or response.status_code not in {403, 406}:
                break
    cached = _read_subscription_cache(cache_path)
    if cached is not None:
        return cached
    raise ConfigError("subscription fetch failed; " + "; ".join(attempts))


def _load_subscription_url(settings: Settings) -> str:
    if not settings.subscription_url_file:
        return ""
    if not settings.subscription_url_file.exists():
        raise ConfigError("SUBSCRIPTION_URL_FILE is set but the file does not exist")
    url = settings.subscription_url_file.read_text(encoding="utf-8").strip()
    if not url:
        raise ConfigError("subscription url file is empty")
    return url


def load_source_config(settings: Settings) -> dict[str, Any]:
    url = _load_subscription_url(settings)
    if url:
        return _read_url(url, _subscription_cache_path(settings, settings.source_path.stem, url))
    if not settings.source_path.exists():
        raise ConfigError(f"source file does not exist: {settings.source_path}")
    return _load_yaml_text(settings.source_path.read_text(encoding="utf-8"))


def _load_sources_manifest(settings: Settings) -> list[dict[str, Any]]:
    if not settings.sources_path.exists():
        return [{"name": settings.source_path.stem, "path": str(settings.source_path)}]
    manifest = _load_yaml_text(settings.sources_path.read_text(encoding="utf-8"))
    raw_sources = manifest.get("sources")
    if raw_sources is None:
        raw_sources = []
        for path in manifest.get("files") or []:
            raw_sources.append({"path": path})
        for url in manifest.get("urls") or []:
            raw_sources.append({"url": url})
        for url_file in manifest.get("url_files") or []:
            raw_sources.append({"url_file": url_file})
    if not isinstance(raw_sources, list):
        raise ConfigError("sources.yaml must contain a sources list")
    sources: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_sources, start=1):
        if isinstance(raw, str):
            raw = {"path": raw}
        if not isinstance(raw, dict):
            continue
        if raw.get("enabled", True) is False:
            continue
        name = str(raw.get("name") or raw.get("label") or f"source-{index}").strip()
        entry = {"name": name or f"source-{index}"}
        for key in ("path", "url", "url_file"):
            value = str(raw.get(key) or "").strip()
            if value:
                entry[key] = value
        if any(key in entry for key in ("path", "url", "url_file")):
            sources.append(entry)
    if not sources:
        raise ConfigError("sources.yaml contains no enabled source entries")
    return sources


def load_source_documents(settings: Settings) -> tuple[list[tuple[str, dict[str, Any]]], list[str]]:
    documents: list[tuple[str, dict[str, Any]]] = []
    errors: list[str] = []
    for entry in _load_sources_manifest(settings):
        name = entry["name"]
        try:
            if entry.get("path"):
                path = Path(entry["path"])
                documents.append((name, _load_yaml_text(path.read_text(encoding="utf-8"))))
            elif entry.get("url_file"):
                path = Path(entry["url_file"])
                url = path.read_text(encoding="utf-8").strip()
                if not url:
                    raise ConfigError(f"url_file is empty: {path}")
                documents.append((name, _read_url(url, _subscription_cache_path(settings, name, url))))
            elif entry.get("url"):
                url = entry["url"]
                documents.append((name, _read_url(url, _subscription_cache_path(settings, name, url))))
        except Exception as exc:  # noqa: BLE001 - report all source failures compactly.
            errors.append(f"{name}: {exc}")
    if documents:
        return documents, errors
    raise ConfigError("no source could be loaded; " + "; ".join(errors))


def _country_from_flag(name: str) -> Optional[dict[str, str]]:
    indicators = [
        ord(char) - 0x1F1E6
        for char in name
        if 0x1F1E6 <= ord(char) <= 0x1F1FF
    ]
    for index in range(len(indicators) - 1):
        first = indicators[index]
        second = indicators[index + 1]
        if 0 <= first <= 25 and 0 <= second <= 25:
            code = f"{chr(first + 65)}{chr(second + 65)}"
            return {"code": code, "name": COUNTRY_LABELS.get(code, f"{code} 地区")}
    return None


def detect_country(name: str) -> dict[str, str]:
    flag_country = _country_from_flag(name)
    if flag_country:
        return flag_country

    normalized = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", " ", name).strip()
    upper_tokens = {token.upper() for token in normalized.split()}
    lowered = normalized.lower()
    for code, label, aliases in COUNTRY_PATTERNS:
        for alias in aliases:
            if alias.isascii() and len(alias) <= 3:
                if alias.upper() in upper_tokens:
                    return {"code": code, "name": label}
            elif alias.lower() in lowered:
                return {"code": code, "name": label}
    return {"code": "OTHER", "name": "其他地区"}


def _unique_name(name: str, source: str, seen: set[str]) -> str:
    if name not in seen:
        seen.add(name)
        return name
    candidate = f"{source} / {name}"
    if candidate not in seen:
        seen.add(candidate)
        return candidate
    index = 2
    while True:
        candidate = f"{source} / {name} ({index})"
        if candidate not in seen:
            seen.add(candidate)
            return candidate
        index += 1


def extract_proxies(data: dict[str, Any], source: str = "source", seen: Optional[set[str]] = None) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    proxies = data.get("proxies")
    if not isinstance(proxies, list):
        raise ConfigError("source config must contain a proxies list")

    result: list[dict[str, Any]] = []
    metadata: list[dict[str, Any]] = []
    names = seen if seen is not None else set()
    for proxy in proxies:
        if not isinstance(proxy, dict):
            continue
        name = str(proxy.get("name", "")).strip()
        if not name:
            continue
        item = copy.deepcopy(proxy)
        unique_name = _unique_name(name, source, names)
        item["name"] = unique_name
        result.append(item)
        metadata.append({
            "name": unique_name,
            "originalName": name,
            "type": str(item.get("type", "proxy")),
            "source": source,
            "country": detect_country(unique_name),
        })

    if not result:
        raise ConfigError("source config contains no usable proxies")
    return result, metadata


def load_proxy_catalog(settings: Settings) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    proxies: list[dict[str, Any]] = []
    metadata: list[dict[str, Any]] = []
    errors: list[str] = []
    seen: set[str] = set()
    documents, source_errors = load_source_documents(settings)
    errors.extend(source_errors)
    for source, data in documents:
        try:
            source_proxies, source_metadata = extract_proxies(data, source=source, seen=seen)
            proxies.extend(source_proxies)
            metadata.extend(source_metadata)
        except ConfigError as exc:
            errors.append(f"{source}: {exc}")
    if not proxies:
        raise ConfigError("no usable proxies found; " + "; ".join(errors))
    return proxies, metadata, errors


def _catalog_summary(proxies: list[dict[str, Any]], metadata: list[dict[str, Any]], source_errors: list[str]) -> dict[str, Any]:
    countries = sorted(
        {item["country"]["code"]: item["country"]["name"] for item in metadata}.items(),
        key=lambda item: (item[0] == "OTHER", item[1]),
    )
    return {
        "nodes": len(proxies),
        "names": [item["name"] for item in metadata],
        "items": metadata,
        "types": sorted({str(item.get("type", "proxy")) for item in proxies}),
        "countries": [{"code": code, "name": name} for code, name in countries],
        "sources": sorted({item["source"] for item in metadata}),
        "source_errors": source_errors,
    }


def _write_catalog_summary(settings: Settings, summary: dict[str, Any]) -> None:
    path = _catalog_path(settings)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(json.dumps(summary, ensure_ascii=False), encoding="utf-8")
    tmp_path.chmod(0o600)
    tmp_path.replace(path)


def load_cached_catalog(settings: Settings) -> dict[str, Any]:
    path = _catalog_path(settings)
    if not path.exists():
        raise ConfigError("catalog cache does not exist")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ConfigError("catalog cache is invalid")
    return data


def build_mihomo_config(settings: Settings, source: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    if source is not None:
        proxies, _ = extract_proxies(source)
    else:
        proxies, _, _ = load_proxy_catalog(settings)
    proxy_names = [proxy["name"] for proxy in proxies]

    groups: list[dict[str, Any]] = []
    listeners: list[dict[str, Any]] = []
    for index, (group_name, port) in enumerate(
        zip(settings.slot_groups, settings.slot_ports),
        start=1,
    ):
        groups.append({
            "name": group_name,
            "type": "select",
            "proxies": proxy_names,
        })
        listeners.append({
            "name": f"fp-slot-{index}",
            "type": "mixed",
            "listen": "0.0.0.0",
            "port": port,
            "proxy": group_name,
        })

    config: dict[str, Any] = {
        "mixed-port": 0,
        "allow-lan": True,
        "bind-address": "*",
        "mode": "rule",
        "log-level": "warning",
        "ipv6": True,
        "external-controller": settings.mihomo_controller,
        "secret": settings.mihomo_secret,
        "unified-delay": True,
        "tcp-concurrent": True,
        "profile": {
            "store-selected": True,
            "store-fake-ip": True,
        },
        "proxies": proxies,
        "proxy-groups": groups,
        "listeners": listeners,
        "rules": ["MATCH,DIRECT"],
    }

    if settings.proxy_auth:
        config["authentication"] = [settings.proxy_auth]

    return config


def write_mihomo_config(settings: Settings) -> dict[str, Any]:
    proxies, metadata, source_errors = load_proxy_catalog(settings)
    config = build_mihomo_config(settings, {"proxies": proxies})
    summary = _catalog_summary(proxies, metadata, source_errors)
    settings.output_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = settings.output_path.with_suffix(settings.output_path.suffix + ".tmp")
    tmp_path.write_text(
        yaml.safe_dump(config, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    tmp_path.chmod(0o600)
    tmp_path.replace(settings.output_path)
    _write_catalog_summary(settings, summary)
    return {
        "output_path": str(settings.output_path),
        "nodes": len(config["proxies"]),
        "countries": sorted({item["country"]["code"] for item in metadata}, key=lambda code: (code == "OTHER", code)),
        "source_errors": source_errors,
        "slots": len(config["listeners"]),
        "ports": [item["port"] for item in config["listeners"]],
    }


def summarize_source(path: Path) -> dict[str, Any]:
    data = _load_yaml_text(path.read_text(encoding="utf-8"))
    proxies, metadata = extract_proxies(data)
    return {
        "nodes": len(proxies),
        "names": [item["name"] for item in metadata],
        "types": sorted({str(item.get("type", "proxy")) for item in proxies}),
    }


def summarize_sources(settings: Settings, prefer_cache: bool = False) -> dict[str, Any]:
    if prefer_cache:
        try:
            return load_cached_catalog(settings)
        except (ConfigError, OSError, json.JSONDecodeError):
            pass
    proxies, metadata, source_errors = load_proxy_catalog(settings)
    summary = _catalog_summary(proxies, metadata, source_errors)
    _write_catalog_summary(settings, summary)
    return summary
