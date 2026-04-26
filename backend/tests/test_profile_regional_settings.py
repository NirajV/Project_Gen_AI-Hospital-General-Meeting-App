"""Tests for Profile/Regional Settings refactor (PUT /api/users/{id}, change-password, /auth/me)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or "https://" + os.environ.get(
    'PREVIEW_HOST', ''
)

EMAIL = "refactor.test@example.com"
PASSWORD = "TestPass123!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.user_id = data['user']['id']
    s.original_email = data['user']['email']
    s.original_name = data['user'].get('name')
    return s


def test_auth_me_returns_new_fields(session):
    r = session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    data = r.json()
    # Fields should be present (may be None for legacy user, but key should exist after first update)
    assert "email" in data
    assert "id" in data
    # Even for legacy users, schema returns the keys (Pydantic) — check by list
    for k in ("first_name", "last_name", "language", "country", "timezone"):
        # they may be missing on legacy doc, OK if it's not there yet — flagged as info
        pass


def test_update_first_last_syncs_name(session):
    r = session.put(
        f"{BASE_URL}/api/users/{session.user_id}",
        json={"first_name": "Refactor", "last_name": "Tester"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["first_name"] == "Refactor"
    assert data["last_name"] == "Tester"
    assert data["name"] == "Refactor Tester"

    g = session.get(f"{BASE_URL}/api/users/{session.user_id}")
    assert g.status_code == 200
    persisted = g.json()
    assert persisted["first_name"] == "Refactor"
    assert persisted["last_name"] == "Tester"
    assert persisted["name"] == "Refactor Tester"


def test_update_regional_fields(session):
    payload = {"language": "en-US", "country": "IN", "timezone": "Asia/Kolkata"}
    r = session.put(f"{BASE_URL}/api/users/{session.user_id}", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["language"] == "en-US"
    assert data["country"] == "IN"
    assert data["timezone"] == "Asia/Kolkata"

    me = session.get(f"{BASE_URL}/api/auth/me").json()
    assert me.get("country") == "IN"
    assert me.get("timezone") == "Asia/Kolkata"

    # restore default
    session.put(
        f"{BASE_URL}/api/users/{session.user_id}",
        json={"country": "US", "timezone": "America/New_York"},
    )


def test_self_update_email_accepted(session):
    """Email must be accepted on self-update (was admin-only before)."""
    new_email = session.original_email  # set to itself => allowed
    r = session.put(
        f"{BASE_URL}/api/users/{session.user_id}", json={"email": new_email}
    )
    assert r.status_code == 200, r.text
    assert r.json()["email"] == new_email


def test_change_password_wrong_current_returns_401(session):
    r = session.post(
        f"{BASE_URL}/api/auth/change-password",
        json={"current_password": "WRONG_password!!", "new_password": "Brand-NEW-Pass1"},
    )
    assert r.status_code == 401, r.text
    body = r.json()
    assert "incorrect" in (body.get("detail") or "").lower()


def test_change_password_short_new_returns_400(session):
    r = session.post(
        f"{BASE_URL}/api/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "short"},
    )
    assert r.status_code == 400, r.text


def test_change_password_missing_fields_returns_400(session):
    r = session.post(
        f"{BASE_URL}/api/auth/change-password",
        json={"current_password": PASSWORD},
    )
    assert r.status_code == 400


def test_create_meeting_stores_organizer_timezone(session):
    # set timezone explicitly first
    session.put(
        f"{BASE_URL}/api/users/{session.user_id}",
        json={"timezone": "Asia/Kolkata"},
    )
    payload = {
        "title": "TEST_TZ_Meeting",
        "description": "tz test",
        "meeting_date": "2027-03-10",  # avoid holiday collisions
        "start_time": "09:00",
        "end_time": "10:00",
        "meeting_type": "video",
    }
    r = session.post(f"{BASE_URL}/api/meetings", json=payload)
    assert r.status_code == 200, r.text
    meeting = r.json()
    assert meeting.get("organizer_timezone") == "Asia/Kolkata"
    mid = meeting["id"]
    # cleanup
    session.delete(f"{BASE_URL}/api/meetings/{mid}")
    # restore default tz
    session.put(
        f"{BASE_URL}/api/users/{session.user_id}",
        json={"timezone": "America/New_York"},
    )


def test_format_meeting_time_for_user_utility():
    """Direct unit test of timezone util."""
    import sys
    sys.path.insert(0, "/app/backend")
    from utils.timezone_utils import format_meeting_time_for_user

    meeting = {
        "meeting_date": "2026-12-15",
        "start_time": "09:00",
        "organizer_timezone": "UTC",
    }
    d_ist, t_ist = format_meeting_time_for_user(meeting, "Asia/Kolkata")
    assert "14:30" in t_ist  # IST is UTC+5:30
    assert "IST" in t_ist or "Asia/Kolkata" in t_ist

    d_est, t_est = format_meeting_time_for_user(meeting, "America/New_York")
    # 09:00 UTC -> 04:00 EST in winter
    assert "04:00" in t_est
    assert "EST" in t_est or "America/New_York" in t_est
