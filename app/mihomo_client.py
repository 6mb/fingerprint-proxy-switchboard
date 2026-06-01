from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx


class MihomoClient:
    def __init__(self, base_url: str, secret: str, timeout: float = 8.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.secret = secret
        self.timeout = timeout

    @property
    def headers(self) -> dict[str, str]:
        if not self.secret:
            return {}
        return {"Authorization": f"Bearer {self.secret}"}

    async def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=self.headers,
                **kwargs,
            )
        response.raise_for_status()
        return response

    async def version(self) -> dict[str, Any]:
        return (await self.request("GET", "/version")).json()

    async def proxies(self) -> dict[str, Any]:
        return (await self.request("GET", "/proxies")).json().get("proxies", {})

    async def select(self, group: str, name: str) -> None:
        path = f"/proxies/{quote(group, safe='')}"
        await self.request("PUT", path, json={"name": name})

    async def delay(self, name: str, url: str, timeout_ms: int = 5000) -> dict[str, Any]:
        path = f"/proxies/{quote(name, safe='')}/delay"
        response = await self.request("GET", path, params={"timeout": timeout_ms, "url": url})
        return response.json()

    async def reload_config(self, path: str) -> None:
        await self.request("PUT", "/configs", params={"force": "true"}, json={"path": path})
