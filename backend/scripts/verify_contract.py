from __future__ import annotations

import sys
import threading
import time
from pathlib import Path

import requests
import uvicorn


def _wait_ready(url: str, timeout_s: float = 5.0) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            r = requests.get(url, timeout=0.5)
            if r.status_code == 200:
                return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError(f"Server not ready: {url}")


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(repo_root))
    config = uvicorn.Config("backend.api:app", host="127.0.0.1", port=8000, log_level="warning")
    server = uvicorn.Server(config)
    t = threading.Thread(target=server.run, daemon=True)
    t.start()

    try:
        _wait_ready("http://127.0.0.1:8000/")

        root = requests.get("http://127.0.0.1:8000/", timeout=5)
        print("ROOT_STATUS", root.status_code)
        print(root.text)
        root_json = root.json()
        assert root_json.get("message") == "SEC Analyzer API is running"

        earnings = requests.get("http://127.0.0.1:8000/earnings", timeout=10)
        print("EARNINGS_STATUS", earnings.status_code)
        earnings_json = earnings.json()
        assert isinstance(earnings_json, list)
        print("EARNINGS_LEN", len(earnings_json))

        bad = requests.get(
            "http://127.0.0.1:8000/analyze",
            params={"ticker": "@@@", "form": "10-Q"},
            timeout=5,
        )
        print("BAD_STATUS", bad.status_code)
        print(bad.text)
        assert bad.status_code in (400, 422)
        bad_json = bad.json()
        assert "code" in bad_json and "message" in bad_json

        analyze = requests.get(
            "http://127.0.0.1:8000/analyze",
            params={"ticker": "AAPL", "form": "10-Q"},
            timeout=180,
        )
        print("ANALYZE_STATUS", analyze.status_code)
        if analyze.status_code != 200:
            print(analyze.text[:2000])
        assert analyze.status_code == 200
        analyze_json = analyze.json()
        assert "meta" in analyze_json and "tables" in analyze_json
        tables = analyze_json.get("tables") or {}
        for k in ("income_statement", "balance_sheet", "cash_flow"):
            assert k in tables

        print("OK")
        return 0

    except Exception as e:
        print("FAIL", type(e).__name__, str(e))
        return 1

    finally:
        server.should_exit = True
        for _ in range(50):
            if not t.is_alive():
                break
            time.sleep(0.1)


if __name__ == "__main__":
    raise SystemExit(main())
