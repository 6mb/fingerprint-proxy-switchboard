#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any
import urllib.error
import urllib.request
import http.cookiejar


def load_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        env[key] = value
    return env


class PanelClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def get(self, path: str) -> Any:
        with self.opener.open(self.base_url + path) as response:
            content_type = response.headers.get("Content-Type", "")
            body = response.read().decode()
        if "application/json" in content_type:
            return json.loads(body)
        return body

    def post(self, path: str, payload: dict[str, Any]) -> Any:
        request = urllib.request.Request(
            self.base_url + path,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with self.opener.open(request) as response:
            body = response.read().decode()
        return json.loads(body)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke test the Fingerprint Proxy Switchboard API.")
    parser.add_argument("--base-url", default=os.environ.get("PANEL_BASE_URL", "http://127.0.0.1:6310"))
    parser.add_argument("--token", default=os.environ.get("PANEL_TOKEN", ""))
    parser.add_argument("--env-file", default="", help="Optional .env file to read PANEL_TOKEN from.")
    parser.add_argument(
        "--mutating",
        action="store_true",
        help="Include reversible write checks such as slot switching and save/reload requests.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    token = args.token
    if not token and args.env_file:
        token = load_env_file(Path(args.env_file)).get("PANEL_TOKEN", "")
    if not token:
        raise SystemExit("missing panel token; pass --token or --env-file")

    client = PanelClient(args.base_url)
    summary: dict[str, Any] = {}

    summary["healthz"] = client.get("/healthz")
    summary["deep_healthz"] = client.get("/healthz/deep")
    summary["session_before"] = client.get("/api/session")
    summary["login"] = client.post("/api/login", {"token": token})

    status = client.get("/api/status")
    panel_settings = client.get("/api/panel-settings")
    sources = client.get("/api/sources")

    summary["status"] = {
        "slots": len(status.get("slots", [])),
        "nodes": len(status.get("nodes", [])),
        "proxy_auth": status.get("auth", {}).get("proxyAuthConfigured"),
    }
    summary["panel_settings"] = {
        "slotCount": panel_settings.get("slotCount"),
        "slotPorts": panel_settings.get("slotPorts"),
    }
    summary["sources"] = {
        "count": len(sources.get("sources", [])),
        "path": sources.get("sourcesPath"),
    }
    summary["export_preview"] = str(client.get("/api/export")).splitlines()[:4]

    if args.mutating:
        summary["panel_save"] = client.post("/api/panel-settings", {"slotPorts": panel_settings["slotPorts"]})
        source_payload = {"sources": [], "reload": False}
        for item in sources["sources"]:
            source_payload["sources"].append({
                "id": item["id"],
                "name": item["name"],
                "kind": item["kind"],
                "value": item["value"],
                "enabled": item["enabled"],
                "keep": item["saved"],
            })
        summary["sources_save"] = client.post("/api/sources", source_payload)

        first_slot = status["slots"][0]
        summary["single_delay"] = client.post("/api/delay", {"name": first_slot["selected"]})
        batch_names = [node["name"] for node in status["nodes"][:3]]
        summary["batch_delay"] = client.post("/api/delays", {"names": batch_names})
        summary["slot_probe"] = client.post(f"/api/slots/{first_slot['id']}/probe", {})

        alternatives = [name for name in first_slot["choices"] if name != first_slot["selected"]]
        if alternatives:
            switched = client.post(f"/api/slots/{first_slot['id']}/select", {"name": alternatives[0]})
            restored = client.post(f"/api/slots/{first_slot['id']}/select", {"name": first_slot["selected"]})
            summary["slot_roundtrip"] = {"to": switched["selected"], "back": restored["selected"]}

        summary["reload"] = client.post("/api/reload", {})

    summary["logout"] = client.post("/api/logout", {})
    summary["session_after"] = client.get("/api/session")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        raise SystemExit(f"HTTP {exc.code}: {detail}") from exc
