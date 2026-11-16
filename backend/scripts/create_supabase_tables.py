"""
Create the qryntiq tables on the configured database (Supabase Postgres).

This uses the app's own SQLAlchemy models, so the schema matches the running
app exactly. It reads DATABASE_URL from backend/.env (see app/config.py), so
point that at your Supabase *session pooler* connection string first, e.g.:

    DATABASE_URL=postgresql://postgres.<ref>:<url-encoded-password>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require

Note: the password must be URL-encoded in the URL ('@' becomes '%40', etc.).

Run it from the backend/ directory with the virtualenv active:

    # Windows
    venv\\Scripts\\python.exe scripts\\create_supabase_tables.py
    # macOS / Linux
    ./venv/bin/python scripts/create_supabase_tables.py

Creating tables is idempotent (CREATE TABLE IF NOT EXISTS); existing tables and
their data are left untouched. To also populate categories and questions, run
the seed instead (it creates the tables too):

    venv\\Scripts\\python.exe -m app.database.seed
"""

import os
import sys

# Make the backend package root importable when run as a plain file.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect  # noqa: E402
from app.database.session import engine, Base  # noqa: E402
import app.models.models  # noqa: E402,F401  (registers all tables on Base)


def _masked_url() -> str:
    """engine.url with the password hidden, for safe printing."""
    try:
        return engine.url.render_as_string(hide_password=True)
    except Exception:
        return str(engine.url)


def main() -> int:
    print(f"Target database : {_masked_url()}")
    expected = sorted(Base.metadata.tables)
    print(f"Models define   : {', '.join(expected)}")

    before = set(inspect(engine).get_table_names())
    Base.metadata.create_all(bind=engine)
    after = set(inspect(engine).get_table_names())

    created = sorted(after - before)
    print(f"Created now     : {', '.join(created) if created else '(none — already existed)'}")
    print(f"Tables present  : {', '.join(sorted(after))}")

    missing = [t for t in expected if t not in after]
    if missing:
        print(f"WARNING: expected tables still missing: {', '.join(missing)}")
        return 1
    print("Done. All expected tables exist.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
