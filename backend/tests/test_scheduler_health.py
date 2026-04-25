"""Backend health + scheduler import sanity tests for the iteration 11 review.

Confirms:
  1. /api/ root reachable (server didn't crash from scheduler import).
  2. /api/auth/login works for the seeded refactor test user.
"""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospital-case-room.preview.emergentagent.com").rstrip("/")
TEST_EMAIL = "refactor.test@example.com"
TEST_PASSWORD = "TestPass123!"


def test_api_root_reachable():
    r = requests.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("status") == "running"


def test_login_refactor_user():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    # Response shape: { access_token, token_type, user }
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    assert "user" in data
    assert data["user"]["email"] == TEST_EMAIL


def test_authenticated_meetings_list():
    login = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=15,
    )
    assert login.status_code == 200
    token = login.json().get("access_token") or login.json().get("token")
    r = requests.get(
        f"{BASE_URL}/api/meetings",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)
