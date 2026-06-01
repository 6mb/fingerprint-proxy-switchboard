from __future__ import annotations

import json
import sys

from .config_builder import ConfigError, write_mihomo_config
from .settings import load_settings


def main() -> int:
    try:
        result = write_mihomo_config(load_settings())
    except (ConfigError, OSError, ValueError) as exc:
        print(f"config generation failed: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
