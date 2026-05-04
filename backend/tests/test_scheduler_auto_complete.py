"""
Unit tests for the scheduler's auto-complete behaviour.

Uses an in-memory fake DB (minimal async stub) so the scheduler can run its
logic without requiring a real MongoDB. This keeps the test fast and hermetic.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

# Make /app/backend importable.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scheduler import _auto_complete_ended_meetings  # noqa: E402


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    async def to_list(self, _n):
        return list(self._docs)


class _Col:
    """Minimal async collection stub supporting find() and update_one()."""

    def __init__(self, docs=None):
        self.docs = docs or []
        self.updates = []  # (filter, update)

    def find(self, filt, _proj=None):
        def match(doc):
            for k, v in filt.items():
                if isinstance(v, dict) and "$in" in v:
                    if doc.get(k) not in v["$in"]:
                        return False
                else:
                    if doc.get(k) != v:
                        return False
            return True

        return _Cursor([d for d in self.docs if match(d)])

    async def find_one(self, filt, _proj=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in filt.items()):
                return d
        return None

    async def update_one(self, filt, update):
        self.updates.append((filt, update))
        # Apply to the in-memory doc so subsequent find_one reflects it.
        for d in self.docs:
            ok = True
            for k, v in filt.items():
                if isinstance(v, dict) and "$in" in v:
                    if d.get(k) not in v["$in"]:
                        ok = False
                        break
                elif d.get(k) != v:
                    ok = False
                    break
            if ok:
                d.update(update.get("$set", {}))
                break


class _DB:
    def __init__(self, meetings, users):
        self.meetings = _Col(meetings)
        self.users = _Col(users)


def _iso(dt):
    return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")


@pytest.mark.asyncio
async def test_auto_completes_past_meeting():
    """Meeting past end_time + grace should flip to completed."""
    os.environ["AUTO_COMPLETE_ENABLED"] = "true"
    os.environ["AUTO_COMPLETE_GRACE_MINUTES"] = "10"

    # Meeting ended 30 min ago in UTC.
    ended = datetime.now(timezone.utc) - timedelta(minutes=30)
    d, t = _iso(ended)

    db = _DB(
        meetings=[{
            "id": "m1",
            "status": "scheduled",
            "organizer_id": "u1",
            "meeting_date": d,
            "start_time": t,
            "end_time": t,
        }],
        users=[{"id": "u1", "timezone": "UTC"}],
    )

    await _auto_complete_ended_meetings(db)
    assert db.meetings.docs[0]["status"] == "completed"
    assert db.meetings.docs[0]["auto_completed"] is True


@pytest.mark.asyncio
async def test_does_not_complete_future_meeting():
    """Meeting in the future must be left alone."""
    os.environ["AUTO_COMPLETE_ENABLED"] = "true"

    future = datetime.now(timezone.utc) + timedelta(hours=2)
    d, t = _iso(future)

    db = _DB(
        meetings=[{
            "id": "m2",
            "status": "scheduled",
            "organizer_id": "u1",
            "meeting_date": d,
            "start_time": t,
            "end_time": t,
        }],
        users=[{"id": "u1", "timezone": "UTC"}],
    )

    await _auto_complete_ended_meetings(db)
    assert db.meetings.docs[0]["status"] == "scheduled"
    assert "auto_completed" not in db.meetings.docs[0]


@pytest.mark.asyncio
async def test_respects_disable_flag():
    """When AUTO_COMPLETE_ENABLED=false, nothing happens."""
    os.environ["AUTO_COMPLETE_ENABLED"] = "false"

    ended = datetime.now(timezone.utc) - timedelta(hours=1)
    d, t = _iso(ended)

    db = _DB(
        meetings=[{
            "id": "m3",
            "status": "scheduled",
            "organizer_id": "u1",
            "meeting_date": d,
            "start_time": t,
            "end_time": t,
        }],
        users=[{"id": "u1", "timezone": "UTC"}],
    )

    await _auto_complete_ended_meetings(db)
    assert db.meetings.docs[0]["status"] == "scheduled"

    # Restore default for subsequent tests.
    os.environ["AUTO_COMPLETE_ENABLED"] = "true"


@pytest.mark.asyncio
async def test_skips_already_completed():
    """A meeting already completed should not be touched."""
    os.environ["AUTO_COMPLETE_ENABLED"] = "true"

    ended = datetime.now(timezone.utc) - timedelta(hours=2)
    d, t = _iso(ended)

    db = _DB(
        meetings=[{
            "id": "m4",
            "status": "completed",
            "organizer_id": "u1",
            "meeting_date": d,
            "start_time": t,
            "end_time": t,
            "completed_at": "2024-01-01T00:00:00+00:00",
        }],
        users=[{"id": "u1", "timezone": "UTC"}],
    )

    await _auto_complete_ended_meetings(db)
    # `auto_completed` flag must not appear on an already-completed meeting.
    assert "auto_completed" not in db.meetings.docs[0]


if __name__ == "__main__":
    # Manual runner for quick sanity.
    async def _run():
        await test_auto_completes_past_meeting()
        await test_does_not_complete_future_meeting()
        await test_respects_disable_flag()
        await test_skips_already_completed()
        print("All scheduler auto-complete tests PASSED")

    asyncio.run(_run())
