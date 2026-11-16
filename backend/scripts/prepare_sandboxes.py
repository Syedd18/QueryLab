"""Build and validate the SQLite databases needed by the deployed API."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.database.seed import create_sandbox_db
from scripts import build_company_bank


def main() -> int:
    sandbox_dir = get_settings().SANDBOX_DB_DIR
    os.makedirs(sandbox_dir, exist_ok=True)

    create_sandbox_db(os.path.join(sandbox_dir, "practice.db"))
    result = build_company_bank.main()
    if result:
        return result

    required = ("practice.db", "practice_v2.db", "practice_tech.db")
    missing = [
        name for name in required
        if not os.path.isfile(os.path.join(sandbox_dir, name))
    ]
    if missing:
        print(f"Sandbox preparation failed; missing database files: {', '.join(missing)}")
        return 1

    print(f"Prepared SQLite sandbox databases in {sandbox_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
