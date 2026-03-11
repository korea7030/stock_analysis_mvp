from __future__ import annotations

import os
import sys
import time
from pathlib import Path


def main() -> int:
    os.environ.setdefault("SEC_RPS", "2")

    repo_root = Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(repo_root))

    from backend.clients import sec_get_filing_html

    class Dummy:
        def get_filing_html(self, *, ticker: str, form: str):
            return b"<html></html>"

    dl = Dummy()
    for i in range(6):
        t0 = time.time()
        sec_get_filing_html(dl, ticker="DUMMY", form="10-Q")
        dt = time.time() - t0
        print("call", i, f"dt_s={dt:.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
