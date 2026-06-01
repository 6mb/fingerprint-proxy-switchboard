from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import yaml


def parse_slot_ports(value: object) -> list[int]:
    ports: list[int] = []
    seen: set[int] = set()
    if isinstance(value, str):
        raw_items: list[object] = value.split(",")
    elif isinstance(value, list):
        raw_items = value
    else:
        raise ValueError("slot ports must be a comma-separated string or a list")

    for raw in raw_items:
        item = str(raw).strip()
        if not item:
            continue
        port = int(item)
        if port < 1 or port > 65535:
            raise ValueError(f"invalid port: {port}")
        if port in seen:
            raise ValueError(f"duplicate port in SLOT_PORTS: {port}")
        seen.add(port)
        ports.append(port)
    if not ports:
        raise ValueError("SLOT_PORTS must contain at least one port")
    return ports


def load_panel_settings(path: Path) -> dict:
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError("panel settings file must contain a YAML mapping")
    return data


@dataclass(frozen=True)
class Settings:
    panel_token: str
    public_host: str
    proxy_auth: str
    mihomo_api: str
    mihomo_secret: str
    mihomo_controller: str
    mihomo_config_path: str
    source_path: Path
    sources_path: Path
    output_path: Path
    panel_settings_path: Path
    subscription_url_file: Optional[Path]
    slot_ports: list[int]
    delay_url: str

    @property
    def slot_groups(self) -> list[str]:
        return [f"FP-SLOT-{index}" for index, _ in enumerate(self.slot_ports, start=1)]

    @property
    def slot_count(self) -> int:
        return len(self.slot_ports)


def load_settings() -> Settings:
    source_path = Path(os.environ.get("SOURCE_PATH", "/app/config/source.yaml"))
    sources_path = Path(os.environ.get("SOURCES_PATH", "/app/config/sources.yaml"))
    output_path = Path(os.environ.get("OUTPUT_PATH", "/app/config/config.yaml"))
    panel_settings_path = Path(os.environ.get("PANEL_SETTINGS_PATH", "/app/config/panel.yaml"))
    subscription_file_raw = os.environ.get("SUBSCRIPTION_URL_FILE", "").strip()
    panel_settings = load_panel_settings(panel_settings_path)
    slot_ports_raw = panel_settings.get("slot_ports", os.environ.get("SLOT_PORTS", "6181,6182,6183,6184,6185,6186"))
    return Settings(
        panel_token=os.environ.get("PANEL_TOKEN", "").strip(),
        public_host=os.environ.get("PUBLIC_HOST", "").strip(),
        proxy_auth=os.environ.get("PROXY_AUTH", "").strip(),
        mihomo_api=os.environ.get("MIHOMO_API", "http://127.0.0.1:6311").rstrip("/"),
        mihomo_secret=os.environ.get("MIHOMO_SECRET", "").strip(),
        mihomo_controller=os.environ.get("MIHOMO_CONTROLLER", "127.0.0.1:6311").strip(),
        mihomo_config_path=os.environ.get("MIHOMO_CONFIG_PATH", "/root/.config/mihomo/config.yaml").strip(),
        source_path=source_path,
        sources_path=sources_path,
        output_path=output_path,
        panel_settings_path=panel_settings_path,
        subscription_url_file=Path(subscription_file_raw) if subscription_file_raw else None,
        slot_ports=parse_slot_ports(slot_ports_raw),
        delay_url=os.environ.get("DELAY_TEST_URL", "https://www.gstatic.com/generate_204").strip(),
    )
