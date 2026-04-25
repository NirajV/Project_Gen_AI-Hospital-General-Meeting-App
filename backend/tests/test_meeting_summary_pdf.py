"""Tests for GET /api/meetings/{id}/summary PDF export endpoint."""
import os
import requests
import pytest
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospital-case-room.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

REFACTOR_USER = {"email": "refactor.test@example.com", "password": "TestPass123!"}
SEEDED_MEETING_ID = "0d78f860-dca3-40d9-b5f5-6248ae8cf97d"


def _login(payload):
    r = requests.post(f"{API}/auth/login", json=payload, timeout=15)
    return r


@pytest.fixture(scope="module")
def organizer_token():
    r = _login(REFACTOR_USER)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token
    return token


@pytest.fixture(scope="module")
def stranger_token():
    """A second, fresh user that is neither organizer nor participant of the seeded meeting."""
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_stranger_{suffix}@example.com"
    payload = {
        "email": email,
        "password": "StrangerPass123!",
        "name": "TEST Stranger",
        "role": "doctor",
        "specialty": "Neurology",
    }
    # Register
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    if r.status_code not in (200, 201):
        # Try a couple of fallback shapes
        pytest.skip(f"register failed: {r.status_code} {r.text[:200]}")
    # Login
    lr = _login({"email": email, "password": payload["password"]})
    assert lr.status_code == 200, lr.text
    return lr.json().get("access_token") or lr.json().get("token")


# --- Tests for GET /api/meetings/{id}/summary ---

def test_summary_pdf_owner_returns_valid_pdf(organizer_token):
    headers = {"Authorization": f"Bearer {organizer_token}"}
    r = requests.get(f"{API}/meetings/{SEEDED_MEETING_ID}/summary", headers=headers, timeout=30)
    assert r.status_code == 200, f"expected 200, got {r.status_code} body={r.text[:200]}"
    ct = r.headers.get("content-type", "")
    assert "application/pdf" in ct.lower(), f"unexpected content-type: {ct}"
    # Magic bytes
    assert r.content[:4] == b"%PDF", f"body does not start with %PDF: {r.content[:20]!r}"
    # Reasonable size
    assert len(r.content) > 500, f"PDF too small: {len(r.content)} bytes"


def test_summary_pdf_non_existent_returns_404(organizer_token):
    headers = {"Authorization": f"Bearer {organizer_token}"}
    fake_id = "ffffffff-ffff-ffff-ffff-ffffffffffff"
    r = requests.get(f"{API}/meetings/{fake_id}/summary", headers=headers, timeout=15)
    assert r.status_code == 404, f"expected 404, got {r.status_code} body={r.text[:200]}"


def test_summary_pdf_forbidden_for_non_participant(stranger_token):
    headers = {"Authorization": f"Bearer {stranger_token}"}
    r = requests.get(f"{API}/meetings/{SEEDED_MEETING_ID}/summary", headers=headers, timeout=15)
    assert r.status_code == 403, f"expected 403, got {r.status_code} body={r.text[:200]}"


def test_summary_pdf_unauthenticated_returns_401_or_403():
    r = requests.get(f"{API}/meetings/{SEEDED_MEETING_ID}/summary", timeout=15)
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"
