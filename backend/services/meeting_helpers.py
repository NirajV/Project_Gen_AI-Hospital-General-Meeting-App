"""
Meeting CRUD helpers — pure pieces of business logic extracted from server.py
to keep the route handlers thin and reduce per-function complexity.

These helpers are intentionally NOT route handlers; they assume the caller has
already authenticated/authorised the user. They preserve the original behaviour
of create_meeting / update_meeting / get_meeting_detail exactly — no semantic
changes, only structural ones.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from core import db, serialize_doc, FRONTEND_URL
from utils.email import send_meeting_invite, send_datetime_change_email
from utils.holiday_checker import validate_meeting_date_for_user
from services.teams_service import get_teams_service

logger = logging.getLogger(__name__)

ALLOWED_UPDATE_FIELDS = [
    'title', 'description', 'meeting_date', 'start_time', 'end_time',
    'meeting_type', 'location', 'video_link', 'status', 'recurrence_type',
]

COUNTRY_DISPLAY = {
    'USA': 'USA Federal',
    'India': 'Indian National',
    'UK': 'UK Public',
}


# ---------------------------------------------------------------------------
# create_meeting helpers
# ---------------------------------------------------------------------------

def validate_meeting_date_or_raise(meeting_date_str: str, current_user: dict) -> None:
    """Raise HTTPException(400) when the date hits the organizer's holiday rules."""
    try:
        date_obj = datetime.strptime(meeting_date_str, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid meeting date format")

    try:
        validation = validate_meeting_date_for_user(date_obj, current_user)
    except Exception as e:
        logger.warning(f"Holiday validation error (proceeding anyway): {e}")
        return

    if validation.get('valid'):
        return

    country_display = COUNTRY_DISPLAY.get(validation.get('country', 'USA'), validation.get('country', 'USA'))
    holiday_name = validation.get('holiday_name')
    raise HTTPException(
        status_code=400,
        detail=(
            f"{country_display} Holiday - No Meeting Schedule. "
            f"{holiday_name} falls on this date. Please choose a different date."
        ),
    )


def calculate_duration_minutes(start_time: str, end_time: str, fallback: int = 60) -> int:
    """Parse HH:MM strings and return positive minutes; fall back on bad input."""
    try:
        sh, sm = start_time.split(':')[:2]
        eh, em = end_time.split(':')[:2]
        return (int(eh) * 60 + int(em)) - (int(sh) * 60 + int(sm))
    except (ValueError, IndexError):
        return fallback


def build_meeting_doc(meeting, current_user: dict, meeting_id: str) -> Dict[str, Any]:
    """Construct the Mongo insert dict for a new meeting (no side effects)."""
    return {
        "id": meeting_id,
        "title": meeting.title,
        "description": meeting.description,
        "meeting_date": meeting.meeting_date,
        "start_time": meeting.start_time,
        "end_time": meeting.end_time,
        "duration_minutes": calculate_duration_minutes(meeting.start_time, meeting.end_time),
        "meeting_type": meeting.meeting_type,
        "location": meeting.location,
        "video_link": meeting.video_link,
        "recurrence_type": meeting.recurrence_type,
        "recurrence_end_date": meeting.recurrence_end_date,
        "recurrence_pattern": meeting.recurrence_pattern,
        "recurrence_week_of_month": meeting.recurrence_week_of_month,
        "recurrence_day_of_week": meeting.recurrence_day_of_week,
        "recurrence_day_of_month": meeting.recurrence_day_of_month,
        "status": "scheduled",
        "organizer_id": current_user['id'],
        "organizer_timezone": current_user.get('timezone') or 'UTC',
        "created_at": datetime.now(timezone.utc).isoformat(),
        "teams_meeting_id": None,
        "teams_join_url": None,
    }


def _safe_zoneinfo(name: Optional[str]) -> ZoneInfo:
    try:
        return ZoneInfo(name or 'UTC')
    except Exception:
        return ZoneInfo('UTC')


async def attach_teams_meeting(meeting_id: str, meeting, current_user: dict) -> None:
    """Create a Teams onlineMeeting and persist its id/joinUrl. Silently no-ops on failure."""
    try:
        teams_service = get_teams_service()
        tz = _safe_zoneinfo(current_user.get('timezone'))
        start_dt = datetime.strptime(
            f"{meeting.meeting_date} {meeting.start_time}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=tz)
        end_dt = datetime.strptime(
            f"{meeting.meeting_date} {meeting.end_time}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=tz)

        teams_meeting = await teams_service.create_online_meeting(
            subject=f"{meeting.title} - Hospital Meeting",
            start_datetime=start_dt,
            end_datetime=end_dt,
        )
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "teams_meeting_id": teams_meeting['id'],
                "teams_join_url": teams_meeting['joinWebUrl'],
            }},
        )
        logger.info(f"Teams meeting created for meeting {meeting_id}")
    except Exception as e:
        logger.error(f"Failed to create Teams meeting for {meeting_id}: {e}")


async def insert_organizer_participant(meeting_id: str, organizer_id: str) -> None:
    await db.meeting_participants.insert_one({
        "id": str(uuid.uuid4()),
        "meeting_id": meeting_id,
        "user_id": organizer_id,
        "role": "organizer",
        "response_status": "accepted",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _send_invite_to(meeting_id: str, meeting, fresh_meeting: dict, participant_user: dict, current_user: dict) -> None:
    meeting_data = {
        "id": meeting_id,
        "title": meeting.title,
        "description": meeting.description,
        "meeting_date": meeting.meeting_date,
        "start_time": meeting.start_time,
        "end_time": meeting.end_time,
        # legacy fields kept for backward compat
        "date": meeting.meeting_date,
        "time": meeting.start_time,
        "location": meeting.location or "To be announced",
        "organizer_timezone": (fresh_meeting or {}).get("organizer_timezone"),
        "teams_join_url": (fresh_meeting or {}).get("teams_join_url"),
        "video_link": meeting.video_link,
        "recurrence_type": meeting.recurrence_type,
    }
    send_meeting_invite(
        meeting=meeting_data,
        participant=participant_user,
        organizer=current_user,
        frontend_url=FRONTEND_URL,
    )


async def insert_participants_and_invite(meeting_id: str, meeting, current_user: dict) -> None:
    """Persist every non-organizer participant and email them an invite."""
    fresh_meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0}) or {}
    for participant_id in meeting.participant_ids or []:
        if participant_id == current_user['id']:
            continue
        await db.meeting_participants.insert_one({
            "id": str(uuid.uuid4()),
            "meeting_id": meeting_id,
            "user_id": participant_id,
            "role": "attendee",
            "response_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        try:
            participant_user = await db.users.find_one({"id": participant_id}, {"_id": 0})
            if participant_user and participant_user.get('email'):
                await _send_invite_to(meeting_id, meeting, fresh_meeting, participant_user, current_user)
                logger.info(f"Sent meeting invite to {participant_user.get('email')}")
        except Exception as e:
            logger.error(f"Failed to send meeting invite: {e}")


async def insert_meeting_patients(meeting_id: str, patient_ids: List[str], current_user: dict) -> None:
    for patient_id in patient_ids or []:
        await db.meeting_patients.insert_one({
            "id": str(uuid.uuid4()),
            "meeting_id": meeting_id,
            "patient_id": patient_id,
            "status": "new_case",
            "added_by": current_user['id'],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


async def insert_agenda_items(meeting_id: str, agenda_items: Optional[List[dict]]) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    for idx, item in enumerate(agenda_items or []):
        await db.agenda_items.insert_one({
            "id": str(uuid.uuid4()),
            "meeting_id": meeting_id,
            "patient_id": item.get('patient_id'),
            "mrn": item.get('mrn'),
            "requested_provider": item.get('requested_provider'),
            "diagnosis": item.get('diagnosis'),
            "reason_for_discussion": item.get('reason_for_discussion'),
            "pathology_required": item.get('pathology_required', False),
            "radiology_required": item.get('radiology_required', False),
            "treatment_plan": item.get('treatment_plan', ''),
            "order_index": idx,
            "created_at": now_iso,
            "updated_at": now_iso,
        })


# ---------------------------------------------------------------------------
# update_meeting helpers
# ---------------------------------------------------------------------------

async def assert_can_update(meeting: dict, updates: dict, current_user: dict) -> None:
    """Raise 403 unless the user is the organizer (or a participant doing status-only)."""
    is_org = meeting['organizer_id'] == current_user['id']
    status_only_update = set(updates.keys()) == {"status"}

    is_meeting_participant = False
    if not is_org:
        participant_doc = await db.meeting_participants.find_one(
            {"meeting_id": meeting['id'], "user_id": current_user['id']}, {"_id": 0}
        )
        is_meeting_participant = participant_doc is not None

    if not is_org and not (status_only_update and is_meeting_participant):
        raise HTTPException(
            status_code=403,
            detail="Only the organizer (or a meeting participant for Start/Complete) can update this meeting",
        )


def build_update_data(meeting: dict, updates: dict) -> Dict[str, Any]:
    """Whitelist-filter `updates` and stamp `completed_at` on first transition to completed."""
    update_data = {k: v for k, v in updates.items() if k in ALLOWED_UPDATE_FIELDS}
    if (
        'status' in update_data
        and update_data['status'] == 'completed'
        and meeting.get('status') != 'completed'
    ):
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    return update_data


def datetime_changed(meeting: dict, update_data: dict) -> bool:
    return (
        ('meeting_date' in update_data and update_data['meeting_date'] != meeting.get('meeting_date'))
        or ('start_time' in update_data and update_data['start_time'] != meeting.get('start_time'))
    )


async def sync_teams_meeting_datetime(meeting: dict, update_data: dict, current_user: dict) -> None:
    """Patch the Teams onlineMeeting so calendar invites show the new schedule."""
    if not meeting.get('teams_meeting_id'):
        return
    try:
        organizer_user = await db.users.find_one(
            {"id": meeting['organizer_id']}, {"_id": 0}
        ) or {}
        tz = _safe_zoneinfo(
            organizer_user.get('timezone') or current_user.get('timezone')
        )

        new_date = update_data.get('meeting_date', meeting.get('meeting_date'))
        new_start = update_data.get('start_time', meeting.get('start_time'))
        new_end = update_data.get('end_time', meeting.get('end_time')) or new_start

        new_start_dt = datetime.strptime(
            f"{new_date} {new_start[:5]}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=tz)
        new_end_dt = datetime.strptime(
            f"{new_date} {new_end[:5]}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=tz)

        teams_service = get_teams_service()
        await teams_service.update_online_meeting(
            meeting_id=meeting['teams_meeting_id'],
            start_datetime=new_start_dt,
            end_datetime=new_end_dt,
            subject=f"{update_data.get('title', meeting.get('title'))} - Hospital Meeting",
        )
        logger.info(
            f"Teams meeting {meeting['teams_meeting_id']} rescheduled to "
            f"{new_start_dt.isoformat()} – {new_end_dt.isoformat()}"
        )
    except Exception as e:
        logger.error(f"Failed to update Teams meeting time for {meeting['id']}: {e}")


async def send_reschedule_notifications(meeting: dict, update_data: dict, current_user: dict) -> None:
    """Email every non-organizer participant who hasn't declined."""
    try:
        participants = await db.meeting_participants.find(
            {"meeting_id": meeting['id'], "response_status": {"$ne": "declined"}},
            {"_id": 0},
        ).to_list(100)

        old_date = meeting.get('meeting_date')
        old_time = meeting.get('start_time')
        updated_meeting = {**meeting, **update_data}

        for pdoc in participants:
            if pdoc['user_id'] == current_user['id']:
                continue  # don't email the organizer
            user = await db.users.find_one({"id": pdoc['user_id']}, {"_id": 0})
            if not user or not user.get('email'):
                continue
            try:
                send_datetime_change_email(
                    meeting=updated_meeting,
                    participant=user,
                    organizer=current_user,
                    old_date=old_date,
                    old_time=old_time,
                    frontend_url=FRONTEND_URL,
                )
                logger.info(f"Sent datetime change notification to {user.get('email')}")
            except Exception as e:
                logger.error(f"Failed to send datetime change email: {e}")
    except Exception as e:
        logger.error(f"Error sending datetime change notifications: {e}")


# ---------------------------------------------------------------------------
# get_meeting_detail helpers
# ---------------------------------------------------------------------------

async def attach_organizer(meeting: dict) -> None:
    organizer = await db.users.find_one(
        {"id": meeting['organizer_id']}, {"_id": 0, "password_hash": 0}
    )
    meeting['organizer'] = serialize_doc(organizer) if organizer else None


async def attach_participants(meeting: dict) -> None:
    participants = await db.meeting_participants.find(
        {"meeting_id": meeting['id']}, {"_id": 0}
    ).to_list(100)
    for p in participants:
        user = await db.users.find_one(
            {"id": p['user_id']},
            {"_id": 0, "name": 1, "email": 1, "specialty": 1, "picture": 1},
        )
        if not user:
            continue
        # Preserve response_status / responded_at while folding in user info.
        response_status = p.get('response_status')
        responded_at = p.get('responded_at')
        p.update(user)
        if response_status:
            p['response_status'] = response_status
        if responded_at:
            p['responded_at'] = responded_at
    meeting['participants'] = [serialize_doc(p) for p in participants]


async def attach_patients(meeting: dict) -> None:
    rows = await db.meeting_patients.find(
        {"meeting_id": meeting['id']}, {"_id": 0}
    ).to_list(100)
    for mp in rows:
        patient = await db.patients.find_one({"id": mp['patient_id']}, {"_id": 0})
        if patient:
            mp.update({
                "first_name": patient.get('first_name'),
                "last_name": patient.get('last_name'),
                "patient_id_number": patient.get('patient_id_number'),
                "primary_diagnosis": patient.get('primary_diagnosis'),
                "department_name": patient.get('department_name'),
                "date_of_birth": patient.get('date_of_birth'),
                "gender": patient.get('gender'),
            })
        if mp.get('added_by'):
            u = await db.users.find_one({"id": mp['added_by']}, {"_id": 0, "name": 1})
            if u:
                mp['added_by_name'] = u.get('name')
        if mp.get('approved_by'):
            u = await db.users.find_one({"id": mp['approved_by']}, {"_id": 0, "name": 1})
            if u:
                mp['approved_by_name'] = u.get('name')
    meeting['patients'] = [serialize_doc(mp) for mp in rows]


async def attach_agenda(meeting: dict) -> None:
    agenda = await db.agenda_items.find(
        {"meeting_id": meeting['id']}, {"_id": 0}
    ).sort("order_index", 1).to_list(100)
    for a in agenda:
        if a.get('assigned_to'):
            u = await db.users.find_one({"id": a['assigned_to']}, {"_id": 0, "name": 1})
            a['assigned_to_name'] = u.get('name') if u else None
        if a.get('patient_id'):
            p = await db.patients.find_one(
                {"id": a['patient_id']}, {"_id": 0, "first_name": 1, "last_name": 1}
            )
            if p:
                a['patient_name'] = (
                    f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
                )
    meeting['agenda'] = [serialize_doc(a) for a in agenda]


async def attach_files(meeting: dict) -> None:
    files = await db.file_attachments.find(
        {"meeting_id": meeting['id']}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for f in files:
        if f.get('uploaded_by'):
            u = await db.users.find_one({"id": f['uploaded_by']}, {"_id": 0, "name": 1})
            f['uploader_name'] = u.get('name') if u else None
    meeting['files'] = [serialize_doc(f) for f in files]


async def attach_decisions(meeting: dict) -> None:
    decisions = await db.decision_logs.find(
        {"meeting_id": meeting['id']}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    meeting['decisions'] = [serialize_doc(d) for d in decisions]
