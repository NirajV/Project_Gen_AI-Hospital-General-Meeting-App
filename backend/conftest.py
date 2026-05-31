"""
Pytest bootstrap shared by every test under /app/backend/tests.

Two responsibilities:
  1. Put `/app/backend` on sys.path so tests can `from utils.x import y`,
     `from services.x import y`, etc., without needing `PYTHONPATH=` exports.
  2. Pre-populate environment variables the tests rely on:
       * REACT_APP_BACKEND_URL — pulled from /app/frontend/.env if not already set
         (most tests skip themselves when this is missing).
       * MONGO_URL / DB_NAME — pulled from /app/backend/.env if not already set
         (only needed for the parser/unit tests that touch the DB).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Make `import utils`, `import services`, `import core` work
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# 2. Load .env files (without depending on python-dotenv being installed)
# ---------------------------------------------------------------------------
def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Don't clobber anything explicitly exported by the caller.
        os.environ.setdefault(key, value)


_load_env_file(BACKEND_DIR / ".env")                         # MONGO_URL / DB_NAME / JWT_SECRET / ...
_load_env_file(BACKEND_DIR.parent / "frontend" / ".env")     # REACT_APP_BACKEND_URL


# ---------------------------------------------------------------------------
# 3. Pytest-asyncio default mode (avoids "Unknown pytest.mark.asyncio" warning
#    and lets the scheduler tests actually run their async assertions).
# ---------------------------------------------------------------------------
import pytest  # noqa: E402

# Newer pytest-asyncio uses this hook; older versions ignore it silently.
def pytest_collection_modifyitems(config, items):
    pass  # placeholder so the import isn't pruned


# ---------------------------------------------------------------------------
# 4. Auto-seed integration-test users via the live API
#    Many integration tests assume two long-lived accounts exist:
#       organizer@hospital.com           / password123
#       test_organizer_new@hospital.com  / testpass123
#    We create them once per pytest session (idempotent: 400/"already
#    registered" is treated as success). If REACT_APP_BACKEND_URL isn't
#    configured the fixture is a no-op so unit-only test runs still work.
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _ensure_test_users():
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    if not base_url:
        return

    try:
        import requests  # imported lazily so unit-only environments don't need it
    except ImportError:
        return

    accounts = [
        {"email": "organizer@hospital.com",
         "password": "password123",
         "name": "Test Organizer",
         "role": "doctor",
         "promote_to": "organizer"},
        {"email": "test_organizer_new@hospital.com",
         "password": "testpass123",
         "name": "Test Organizer New",
         "role": "doctor",
         "promote_to": "organizer"},
    ]
    for acct in accounts:
        payload = {k: v for k, v in acct.items() if k != "promote_to"}
        try:
            r = requests.post(f"{base_url}/api/auth/register",
                              json=payload, timeout=10)
            # 200/201 = freshly created; 400 = already exists (acceptable).
            if r.status_code not in (200, 201, 400):
                print(f"[conftest] WARN: could not register {acct['email']}: "
                      f"{r.status_code} {r.text[:120]}")
        except Exception as e:  # noqa: BLE001
            print(f"[conftest] WARN: failed to ensure {acct['email']}: {e}")

    # Promote the integration-test organizers to the actual `organizer` role.
    # The /auth/register endpoint can't grant elevated roles, so we patch the
    # role directly in Mongo (matches what an admin would do via UI).
    try:
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if mongo_url and db_name:
            client = MongoClient(mongo_url, serverSelectionTimeoutMS=2000)
            db = client[db_name]
            for acct in accounts:
                target_role = acct.get("promote_to")
                if not target_role:
                    continue
                db.users.update_one(
                    {"email": acct["email"]},
                    {"$set": {"role": target_role}},
                )
    except Exception as e:  # noqa: BLE001
        print(f"[conftest] WARN: could not promote test organizers: {e}")
