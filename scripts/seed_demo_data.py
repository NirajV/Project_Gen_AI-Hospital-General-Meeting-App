"""
Seed Demo Data for BioMedMeet (Hospital Meeting Scheduler).

Generates a realistic demo dataset:
  * 1 organizer user (or reuses if exists)
  * 20 participant users (doctors/nurses/admins) with real-sounding names
  * 25 patients with real-sounding names and DOBs
  * 12 meetings:
        - 3 one-time
        - 3 daily-recurring
        - 3 weekly-recurring
        - 3 monthly-recurring on the First Monday / Tuesday / Thursday
  * 50 agenda items, each tied to one of the patients
  * meeting_participants and meeting_patients link rows so the meetings show
    real attendees and patient cases in the UI.

USAGE
-----
    # Default seed (idempotent; will not duplicate by email/patient_id_number)
    python /app/scripts/seed_demo_data.py

    # Wipe seeded demo rows first, then reinsert a fresh batch
    python /app/scripts/seed_demo_data.py --purge

The script connects to MongoDB using MONGO_URL / DB_NAME from /app/backend/.env
(falling back to environment variables already exported in the shell).

All seeded rows are tagged with `"_seed": "demo_v1"` so the --purge flag only
removes seeded rows and never touches real production data.

Default credentials for every created user:
    password = TestPass123!
"""
from __future__ import annotations

import argparse
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import bcrypt
from pymongo import MongoClient

# ---------------------------------------------------------------------------
# Config loading (reads /app/backend/.env without depending on python-dotenv)
# ---------------------------------------------------------------------------

# Try a few locations so the script works both inside the Emergent container
# (where the repo lives at /app) and on a developer's local machine where the
# repo can be cloned anywhere.
ENV_CANDIDATES_CHECKED: list[Path] = []


def _find_backend_env():
    here = Path(__file__).resolve().parent
    candidates = [
        Path("/app/backend/.env"),
        here.parent / "backend" / ".env",   # <repo>/scripts/.. -> <repo>/backend/.env
        here.parent / ".env",               # <repo>/.env
        Path.cwd() / "backend" / ".env",
        Path.cwd() / ".env",
    ]
    for c in candidates:
        ENV_CANDIDATES_CHECKED.append(c)
        if c.exists():
            return c
    return None


def _load_backend_env() -> None:
    """Lightweight .env loader so the script works without dotenv installed."""
    env_path = _find_backend_env()
    if env_path is None:
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Don't overwrite anything already set in the shell.
        os.environ.setdefault(key, value)


_load_backend_env()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
if not MONGO_URL or not DB_NAME:
    print("ERROR: MONGO_URL / DB_NAME must be set (check /app/backend/.env).")
    sys.exit(1)

SEED_TAG = "demo_v1"
DEFAULT_PASSWORD = "TestPass123!"

# Pin RNG so re-runs assign the same patients to the same meetings.
random.seed(42)


# ---------------------------------------------------------------------------
# Demo data pools (real-looking names, DOBs, clinical details)
# ---------------------------------------------------------------------------

ORGANIZER = {
    "email": "dr.organizer@biomedmeet.demo",
    "first_name": "Niraj",
    "last_name": "Vishwakarma",
    "specialty": "Hospital Medicine",
    "role": "doctor",
    "organization": "BioMedMeet Demo Hospital",
    "phone": "+1-415-555-0100",
}

# 20 realistic participants — mix of US + Indian clinicians, varied specialties.
PARTICIPANTS = [
    ("Aarav",     "Sharma",     "Cardiology",           "doctor",  "+1-415-555-0101"),
    ("Priya",     "Patel",      "Oncology",             "doctor",  "+1-415-555-0102"),
    ("Rohan",     "Mehta",      "Neurology",            "doctor",  "+1-415-555-0103"),
    ("Ananya",    "Iyer",       "Radiology",            "doctor",  "+1-415-555-0104"),
    ("Vikram",    "Singh",      "General Surgery",      "doctor",  "+1-415-555-0105"),
    ("Sneha",     "Kapoor",     "Pediatrics",           "doctor",  "+1-415-555-0106"),
    ("James",     "Anderson",   "Internal Medicine",    "doctor",  "+1-415-555-0107"),
    ("Emily",     "Thompson",   "Emergency Medicine",   "doctor",  "+1-415-555-0108"),
    ("Michael",   "Rodriguez",  "Orthopedics",          "doctor",  "+1-415-555-0109"),
    ("Sarah",     "Williams",   "Obstetrics",           "doctor",  "+1-415-555-0110"),
    ("David",     "Chen",       "Pulmonology",          "doctor",  "+1-415-555-0111"),
    ("Linda",     "Garcia",     "Endocrinology",        "doctor",  "+1-415-555-0112"),
    ("Arjun",     "Reddy",      "Gastroenterology",     "doctor",  "+1-415-555-0113"),
    ("Meera",     "Nair",       "Nephrology",           "doctor",  "+1-415-555-0114"),
    ("Robert",    "Johnson",    "Pathology",            "doctor",  "+1-415-555-0115"),
    ("Olivia",    "Martinez",   "Psychiatry",           "doctor",  "+1-415-555-0116"),
    ("Karan",     "Joshi",      "Urology",              "doctor",  "+1-415-555-0117"),
    ("Hannah",    "Lee",        "Nursing",              "nurse",   "+1-415-555-0118"),
    ("Ravi",      "Kumar",      "Hospital Admin",       "admin",   "+1-415-555-0119"),
    ("Jessica",   "Brown",      "Care Coordination",    "nurse",   "+1-415-555-0120"),
]

# 25 realistic patient records — names, DOBs and diagnoses.
PATIENTS = [
    ("Aiden",     "Walker",     "1958-04-12", "Male",   "Stage II Lung Adenocarcinoma",      "Oncology",        "Dr. Priya Patel"),
    ("Olivia",    "Mitchell",   "1972-08-23", "Female", "Hypertensive Heart Disease",        "Cardiology",      "Dr. Aarav Sharma"),
    ("Liam",      "Carter",     "1983-12-05", "Male",   "Acute Lymphoblastic Leukemia",      "Oncology",        "Dr. Priya Patel"),
    ("Ananya",    "Krishnan",   "1965-02-18", "Female", "Glioblastoma Multiforme",           "Neurology",       "Dr. Rohan Mehta"),
    ("Noah",      "Bennett",    "1991-07-09", "Male",   "Crohn's Disease",                   "Gastroenterology","Dr. Arjun Reddy"),
    ("Emma",      "Phillips",   "1949-11-30", "Female", "Chronic Kidney Disease Stage 4",    "Nephrology",      "Dr. Meera Nair"),
    ("Vihaan",    "Desai",      "2001-03-15", "Male",   "Hodgkin Lymphoma",                  "Oncology",        "Dr. Priya Patel"),
    ("Sophia",    "Reyes",      "1977-09-22", "Female", "Breast Cancer (HER2+)",             "Oncology",        "Dr. Priya Patel"),
    ("Mason",     "Hughes",     "1962-06-08", "Male",   "Coronary Artery Disease",           "Cardiology",      "Dr. Aarav Sharma"),
    ("Ishaan",    "Rao",        "1988-01-27", "Male",   "Type 1 Diabetes Mellitus",          "Endocrinology",   "Dr. Linda Garcia"),
    ("Isabella",  "Foster",     "1995-05-14", "Female", "Multiple Sclerosis",                "Neurology",       "Dr. Rohan Mehta"),
    ("Ethan",     "Murphy",     "1954-10-19", "Male",   "Prostate Adenocarcinoma",           "Urology",         "Dr. Karan Joshi"),
    ("Aanya",     "Kulkarni",   "2014-02-11", "Female", "Pediatric Asthma",                  "Pediatrics",      "Dr. Sneha Kapoor"),
    ("Charlotte", "Price",      "1969-07-30", "Female", "Rheumatoid Arthritis",              "Internal Medicine","Dr. James Anderson"),
    ("Logan",     "Russell",    "1980-12-22", "Male",   "Hepatocellular Carcinoma",          "Oncology",        "Dr. Priya Patel"),
    ("Mia",       "Coleman",    "1973-04-04", "Female", "COPD with Exacerbation",            "Pulmonology",     "Dr. David Chen"),
    ("Kabir",     "Bhatt",      "1996-08-17", "Male",   "Testicular Seminoma",               "Urology",         "Dr. Karan Joshi"),
    ("Amelia",    "Watson",     "1947-09-02", "Female", "Atrial Fibrillation",               "Cardiology",      "Dr. Aarav Sharma"),
    ("Lucas",     "Brooks",     "1985-11-25", "Male",   "Pancreatic Adenocarcinoma",         "Oncology",        "Dr. Priya Patel"),
    ("Diya",      "Saxena",     "2010-06-06", "Female", "Acute Lymphoblastic Leukemia",      "Pediatrics",      "Dr. Sneha Kapoor"),
    ("Henry",     "Sanders",    "1953-03-19", "Male",   "Parkinson's Disease",               "Neurology",       "Dr. Rohan Mehta"),
    ("Grace",     "Patterson",  "1968-10-08", "Female", "Colorectal Cancer Stage III",       "Oncology",        "Dr. Priya Patel"),
    ("Aditya",    "Verma",      "1979-05-21", "Male",   "Chronic Hepatitis B",               "Gastroenterology","Dr. Arjun Reddy"),
    ("Zoe",       "Ramirez",    "1992-12-13", "Female", "Polycystic Ovary Syndrome",         "Endocrinology",   "Dr. Linda Garcia"),
    ("Daniel",    "Wright",     "1960-08-29", "Male",   "Bladder Cancer",                    "Urology",         "Dr. Karan Joshi"),
]

ALLERGIES_POOL = ["Penicillin", "Sulfa drugs", "NSAIDs", "None known", "Latex", "Peanuts", "Aspirin"]
MEDICATIONS_POOL = [
    "Lisinopril 10mg daily",
    "Metformin 500mg BID",
    "Atorvastatin 40mg daily",
    "Levothyroxine 50mcg daily",
    "Amlodipine 5mg daily",
    "Tamoxifen 20mg daily",
    "Carboplatin (chemotherapy cycle)",
    "Insulin Glargine 20U HS",
]

CITIES = [
    "1245 Oak Ridge Ln, San Francisco, CA 94110",
    "812 Maple Ave, Boston, MA 02115",
    "456 Sunset Blvd, Los Angeles, CA 90028",
    "920 Pearl St, Austin, TX 78701",
    "75 Beacon Hill Rd, Chicago, IL 60611",
    "1502 Cherry Tree Ln, Seattle, WA 98101",
    "Plot 18, Bandra West, Mumbai 400050, India",
    "B-204 Whitefield, Bengaluru 560066, India",
]

# Agenda variations to fill 50 rows from 25 patients (2x each).
AGENDA_VARIATIONS = [
    ("Initial tumor board presentation",     "Multidisciplinary review",         True,  True),
    ("Treatment plan reassessment",          "Post-cycle imaging review",        False, True),
    ("Surgical candidacy discussion",        "Pre-operative planning",           True,  True),
    ("Pathology correlation",                "Histology review post-biopsy",     True,  False),
    ("Imaging follow-up",                    "Restaging CT/MRI review",          False, True),
    ("Palliative care alignment",            "Symptom management discussion",    False, False),
    ("Adjuvant therapy decision",            "Post-surgical chemo evaluation",   True,  True),
    ("Genetic profiling review",             "Molecular markers / NGS results",  True,  False),
    ("Clinical trial eligibility",           "Screen for open protocols",        False, False),
    ("Discharge / outpatient plan",          "Care transition planning",         False, False),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def first_weekday_of_next_month(target_weekday: int, months_ahead: int = 1) -> date:
    """Return the date of the first <target_weekday> in (today + months_ahead) month.

    target_weekday: Monday=0 ... Sunday=6
    """
    today = date.today()
    year = today.year
    month = today.month + months_ahead
    while month > 12:
        month -= 12
        year += 1
    d = date(year, month, 1)
    offset = (target_weekday - d.weekday()) % 7
    return d + timedelta(days=offset)


def upsert_user(db, *, email, first_name, last_name, specialty, role, phone, organization) -> str:
    """Insert or update a user. Returns the user's id."""
    existing = db.users.find_one({"email": email}, {"_id": 0, "id": 1})
    if existing:
        return existing["id"]

    user_id = str(uuid.uuid4())
    db.users.insert_one({
        "id": user_id,
        "email": email,
        "name": f"Dr. {first_name} {last_name}" if role == "doctor" else f"{first_name} {last_name}",
        "first_name": first_name,
        "last_name": last_name,
        "password_hash": hash_password(DEFAULT_PASSWORD),
        "specialty": specialty,
        "organization": organization,
        "phone": phone,
        "role": role,
        "language": "en-US",
        "country": "US",
        "timezone": "America/New_York",
        "picture": None,
        "is_active": True,
        "requires_password_change": False,
        "created_at": now_iso(),
        "_seed": SEED_TAG,
    })
    return user_id


def upsert_patient(db, *, organizer_id, mrn, first_name, last_name, dob, gender,
                   diagnosis, department, provider) -> str:
    existing = db.patients.find_one({"patient_id_number": mrn}, {"_id": 0, "id": 1})
    if existing:
        return existing["id"]

    patient_id = str(uuid.uuid4())
    db.patients.insert_one({
        "id": patient_id,
        "patient_id_number": mrn,
        "first_name": first_name,
        "last_name": last_name,
        "date_of_birth": dob,
        "gender": gender,
        "email": f"{first_name}.{last_name}@example.com".lower(),
        "phone": f"+1-415-555-{random.randint(1000, 9999)}",
        "address": random.choice(CITIES),
        "primary_diagnosis": diagnosis,
        "allergies": random.choice(ALLERGIES_POOL),
        "current_medications": random.choice(MEDICATIONS_POOL),
        "department_name": department,
        "department_provider_name": provider,
        "notes": "Seeded demo patient.",
        "is_active": True,
        "created_by": organizer_id,
        "created_at": now_iso(),
        "_seed": SEED_TAG,
    })
    return patient_id


def insert_meeting(db, *, organizer_id, organizer_tz, title, description,
                   meeting_date, start_time, end_time, recurrence) -> str:
    """recurrence: dict with keys recurrence_type and any of recurrence_end_date,
    recurrence_day_of_week, recurrence_day_of_month, recurrence_week_of_month."""
    meeting_id = str(uuid.uuid4())
    sh, sm = map(int, start_time.split(":"))
    eh, em = map(int, end_time.split(":"))
    duration = (eh * 60 + em) - (sh * 60 + sm)

    doc = {
        "id": meeting_id,
        "title": title,
        "description": description,
        "meeting_date": meeting_date,
        "start_time": start_time,
        "end_time": end_time,
        "duration_minutes": duration,
        "meeting_type": "video",
        "location": "Conference Room A / MS Teams",
        "video_link": None,
        "recurrence_type": recurrence.get("recurrence_type", "one_time"),
        "recurrence_end_date": recurrence.get("recurrence_end_date"),
        "recurrence_pattern": recurrence.get("recurrence_pattern"),
        "recurrence_week_of_month": recurrence.get("recurrence_week_of_month"),
        "recurrence_day_of_week": recurrence.get("recurrence_day_of_week"),
        "recurrence_day_of_month": recurrence.get("recurrence_day_of_month"),
        "status": "scheduled",
        "organizer_id": organizer_id,
        "organizer_timezone": organizer_tz,
        "created_at": now_iso(),
        "teams_meeting_id": None,
        "teams_join_url": None,
        "_seed": SEED_TAG,
    }
    db.meetings.insert_one(doc)

    # Organizer auto-attached as accepted participant (mirrors server.py logic).
    db.meeting_participants.insert_one({
        "id": str(uuid.uuid4()),
        "meeting_id": meeting_id,
        "user_id": organizer_id,
        "role": "organizer",
        "response_status": "accepted",
        "created_at": now_iso(),
        "_seed": SEED_TAG,
    })
    return meeting_id


def attach_participants(db, meeting_id: str, user_ids: list[str]) -> None:
    """Idempotently attach the given user ids to a meeting as 'attendee'."""
    for uid in user_ids:
        existing = db.meeting_participants.find_one(
            {"meeting_id": meeting_id, "user_id": uid}, {"_id": 0, "id": 1}
        )
        if existing:
            continue
        db.meeting_participants.insert_one({
            "id": str(uuid.uuid4()),
            "meeting_id": meeting_id,
            "user_id": uid,
            "role": "attendee",
            "response_status": random.choice(["pending", "accepted", "accepted", "tentative"]),
            "created_at": now_iso(),
            "_seed": SEED_TAG,
        })


def attach_patients_to_meeting(db, meeting_id: str, patient_ids: list[str], organizer_id: str) -> None:
    for pid in patient_ids:
        db.meeting_patients.insert_one({
            "id": str(uuid.uuid4()),
            "meeting_id": meeting_id,
            "patient_id": pid,
            "status": random.choice(["new_case", "follow_up", "new_case"]),
            "added_by": organizer_id,
            "created_at": now_iso(),
            "_seed": SEED_TAG,
        })


def insert_agenda_item(db, *, meeting_id, patient_id, mrn, provider, diagnosis,
                       reason, title_extra, pathology, radiology, order_index) -> None:
    db.agenda_items.insert_one({
        "id": str(uuid.uuid4()),
        "meeting_id": meeting_id,
        "patient_id": patient_id,
        "mrn": mrn,
        "requested_provider": provider,
        "diagnosis": diagnosis,
        "reason_for_discussion": f"{title_extra}: {reason}",
        "pathology_required": pathology,
        "radiology_required": radiology,
        "treatment_plan": "",
        "order_index": order_index,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "_seed": SEED_TAG,
    })


def purge_seed(db) -> None:
    collections = [
        "users", "patients", "meetings",
        "meeting_participants", "meeting_patients", "agenda_items",
    ]
    print("Purging previously seeded rows (_seed in {'%s', 'demo_v1_auto'})..." % SEED_TAG)
    for name in collections:
        result = db[name].delete_many({"_seed": {"$in": [SEED_TAG, "demo_v1_auto"]}})
        print(f"  {name}: removed {result.deleted_count}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed BioMedMeet demo data.")
    parser.add_argument("--purge", action="store_true",
                        help="Delete previously seeded rows before re-inserting.")
    parser.add_argument("--mongo-url", default=None,
                        help="Override MONGO_URL (e.g. mongodb://localhost:27017).")
    parser.add_argument("--db-name", default=None,
                        help="Override DB_NAME (e.g. hospital_meeting_scheduler).")
    args = parser.parse_args()

    mongo_url = args.mongo_url or MONGO_URL
    db_name = args.db_name or DB_NAME
    if not mongo_url or not db_name:
        print("ERROR: MONGO_URL / DB_NAME not found.")
        print("  Checked these .env locations:")
        for c in ENV_CANDIDATES_CHECKED:
            print(f"    - {c}  {'(found)' if c.exists() else '(missing)'}")
        print("\nFix options (pick one):")
        print("  1) Pass them on the command line:")
        print("       python scripts/seed_demo_data.py \\")
        print("         --mongo-url mongodb://localhost:27017 \\")
        print("         --db-name hospital_meeting_scheduler")
        print("  2) Export them as env vars:")
        print("       export MONGO_URL=mongodb://localhost:27017")
        print("       export DB_NAME=hospital_meeting_scheduler")
        print("       python scripts/seed_demo_data.py")
        print("  3) Create a backend/.env with MONGO_URL=... and DB_NAME=...")
        sys.exit(1)

    client = MongoClient(mongo_url)
    db = client[db_name]
    print(f"Connected to MongoDB: {mongo_url} / {db_name}")

    if args.purge:
        purge_seed(db)

    # ----- Organizer -----
    organizer_id = upsert_user(
        db,
        email=ORGANIZER["email"],
        first_name=ORGANIZER["first_name"],
        last_name=ORGANIZER["last_name"],
        specialty=ORGANIZER["specialty"],
        role=ORGANIZER["role"],
        phone=ORGANIZER["phone"],
        organization=ORGANIZER["organization"],
    )
    organizer_tz = "America/New_York"
    print(f"Organizer ready: {ORGANIZER['email']} (id={organizer_id})")

    # ----- 20 Participants -----
    participant_ids = []
    for first, last, specialty, role, phone in PARTICIPANTS:
        email = f"{first}.{last}@biomedmeet.demo".lower()
        uid = upsert_user(
            db, email=email, first_name=first, last_name=last,
            specialty=specialty, role=role, phone=phone,
            organization="BioMedMeet Demo Hospital",
        )
        participant_ids.append(uid)
    print(f"Participants ready: {len(participant_ids)}")

    # ----- 25 Patients -----
    patient_records = []  # (id, mrn, full_name, diagnosis, provider)
    for idx, (first, last, dob, gender, diag, dept, provider) in enumerate(PATIENTS, start=1):
        mrn = f"MRN-{1000 + idx:05d}"
        pid = upsert_patient(
            db, organizer_id=organizer_id, mrn=mrn,
            first_name=first, last_name=last, dob=dob, gender=gender,
            diagnosis=diag, department=dept, provider=provider,
        )
        patient_records.append({
            "id": pid, "mrn": mrn, "name": f"{first} {last}",
            "diagnosis": diag, "provider": provider,
        })
    print(f"Patients ready: {len(patient_records)}")

    # ----- 12 Meetings -----
    today = date.today()
    next_week = today + timedelta(days=7)
    rec_end = (today + timedelta(days=180)).isoformat()

    meeting_specs = []

    # 3 One-time meetings (T+2, T+7, T+14)
    for i, offset in enumerate([2, 7, 14], start=1):
        meeting_specs.append({
            "title": f"One-Time Tumor Board #{i}",
            "description": "Single-session multidisciplinary case review.",
            "meeting_date": (today + timedelta(days=offset)).isoformat(),
            "start_time": "09:00",
            "end_time": "10:30",
            "recurrence": {"recurrence_type": "one_time"},
        })

    # 3 Daily-recurring meetings (start tomorrow, in 3 days, in 5 days)
    for i, offset in enumerate([1, 3, 5], start=1):
        meeting_specs.append({
            "title": f"Daily Morning Huddle #{i}",
            "description": "Daily clinical handover across departments.",
            "meeting_date": (today + timedelta(days=offset)).isoformat(),
            "start_time": "08:00",
            "end_time": "08:30",
            "recurrence": {"recurrence_type": "daily", "recurrence_end_date": rec_end},
        })

    # 3 Weekly meetings (Mon / Wed / Fri starting next_week)
    weekly_specs = [
        ("monday",    "Weekly Cardiology MDT",       0),
        ("wednesday", "Weekly Oncology Tumor Board", 2),
        ("friday",    "Weekly Surgery Rounds",       4),
    ]
    for dow_name, title, weekday_idx in weekly_specs:
        # Find next occurrence of that weekday >= next_week
        offset = (weekday_idx - next_week.weekday()) % 7
        first_date = next_week + timedelta(days=offset)
        meeting_specs.append({
            "title": title,
            "description": f"Recurring weekly meeting every {dow_name.title()}.",
            "meeting_date": first_date.isoformat(),
            "start_time": "14:00",
            "end_time": "15:00",
            "recurrence": {
                "recurrence_type": "weekly",
                "recurrence_day_of_week": dow_name,
                "recurrence_end_date": rec_end,
            },
        })

    # 3 Monthly-on meetings: First Monday / Tuesday / Thursday of the month
    monthly_specs = [
        ("monday",   0, "Monthly Neurology Case Conference"),
        ("tuesday",  1, "Monthly Pediatrics Grand Rounds"),
        ("thursday", 3, "Monthly Hospital Leadership Review"),
    ]
    for dow_name, weekday_idx, title in monthly_specs:
        first_date = first_weekday_of_next_month(weekday_idx, months_ahead=1)
        meeting_specs.append({
            "title": title,
            "description": f"Monthly meeting on the first {dow_name.title()} of every month.",
            "meeting_date": first_date.isoformat(),
            "start_time": "16:00",
            "end_time": "17:30",
            "recurrence": {
                "recurrence_type": "monthly_on",
                "recurrence_week_of_month": "first",
                "recurrence_day_of_week": dow_name,
                "recurrence_end_date": rec_end,
            },
        })

    created_meeting_ids = []
    for spec in meeting_specs:
        mid = insert_meeting(
            db,
            organizer_id=organizer_id,
            organizer_tz=organizer_tz,
            title=spec["title"],
            description=spec["description"],
            meeting_date=spec["meeting_date"],
            start_time=spec["start_time"],
            end_time=spec["end_time"],
            recurrence=spec["recurrence"],
        )
        created_meeting_ids.append(mid)

        # Attach 4-7 patients per meeting
        chosen_patients = random.sample(patient_records, k=random.randint(4, 7))
        attach_patients_to_meeting(db, mid, [p["id"] for p in chosen_patients], organizer_id)

    print(f"Meetings created: {len(created_meeting_ids)}")

    # ----- Make every existing user a participant of every seed meeting -----
    # This is what makes the demo data visible to anyone who logs in.
    all_user_ids = [u["id"] for u in db.users.find(
        {"is_active": True}, {"_id": 0, "id": 1}
    )]
    backfill_count = 0
    for mid in created_meeting_ids:
        before = db.meeting_participants.count_documents({"meeting_id": mid})
        attach_participants(
            db, mid, [uid for uid in all_user_ids if uid != organizer_id]
        )
        after = db.meeting_participants.count_documents({"meeting_id": mid})
        backfill_count += (after - before)
    print(f"Participants attached across all seed meetings: {len(all_user_ids)} users "
          f"× {len(created_meeting_ids)} meetings (added {backfill_count} new rows)")

    # ----- 50 Agenda Items (2 per patient, distributed across meetings) -----
    # Spread 50 items so each meeting gets ~4 items and each patient appears twice.
    agenda_total = 50
    items_per_meeting = agenda_total // len(created_meeting_ids)  # = 4
    leftover = agenda_total - items_per_meeting * len(created_meeting_ids)  # = 2

    # Build pool of (patient, variation) pairs: each patient repeated twice
    pool = []
    for p in patient_records:
        pool.append((p, AGENDA_VARIATIONS[0]))
        pool.append((p, AGENDA_VARIATIONS[1]))
    random.shuffle(pool)

    # Vary the title_extra across the 10 variations so they look diverse.
    extended_variations = AGENDA_VARIATIONS * 5  # 50 entries
    random.shuffle(extended_variations)

    cursor = 0
    for m_idx, meeting_id in enumerate(created_meeting_ids):
        # First N meetings get one extra item to use up the leftover.
        count = items_per_meeting + (1 if m_idx < leftover else 0)
        used_patients_in_meeting = set()
        order_idx = 0
        attempts = 0
        while count > 0 and attempts < 200:
            attempts += 1
            if cursor >= len(pool):
                # Shouldn't happen for 50 items, but guard anyway.
                random.shuffle(pool)
                cursor = 0
            patient, _ = pool[cursor]
            cursor += 1
            # Avoid the same patient twice in one meeting (server.py enforces this).
            if patient["id"] in used_patients_in_meeting:
                continue
            used_patients_in_meeting.add(patient["id"])

            variation = extended_variations[(m_idx * items_per_meeting + order_idx) % len(extended_variations)]
            title_extra, reason, pathology, radiology = variation

            insert_agenda_item(
                db,
                meeting_id=meeting_id,
                patient_id=patient["id"],
                mrn=patient["mrn"],
                provider=patient["provider"],
                diagnosis=patient["diagnosis"],
                reason=reason,
                title_extra=title_extra,
                pathology=pathology,
                radiology=radiology,
                order_index=order_idx,
            )
            order_idx += 1
            count -= 1

    print(f"Agenda items created: ~{agenda_total}")

    # ----- Summary -----
    print("\n=== SEED SUMMARY ===")
    print(f"Organizer email      : {ORGANIZER['email']}")
    print(f"Default password     : {DEFAULT_PASSWORD}")
    print(f"Participants created : {len(participant_ids)}")
    print(f"Patients created     : {len(patient_records)}")
    print(f"Meetings created     : {len(created_meeting_ids)}  (3 one-time, 3 daily, 3 weekly, 3 monthly-on)")
    print(f"Agenda items created : {agenda_total}")
    print("\nLogin as the organizer to see everything wired up.")
    print(f"  URL    : {os.environ.get('FRONTEND_URL', 'https://hospital-case-room.preview.emergentagent.com')}/login")
    print(f"  Email  : {ORGANIZER['email']}")
    print(f"  Password: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    main()
