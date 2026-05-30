# Test Credentials

## Refactor Test User (created Apr 2026)
- Email: `refactor.test@example.com`
- Password: `TestPass123!`
- Name: Refactor Test
- Role: doctor
- Specialty: Cardiology

Use this account for any UI testing of the meeting detail / files / decisions flows.

---

## Demo Seed Data (created Feb 2026, via `/app/scripts/seed_demo_data.py`)

### Organizer (owns the 12 demo meetings)
- Email: `dr.organizer@biomedmeet.demo`
- Password: `TestPass123!`
- Name: Dr. Niraj Vishwakarma
- Role: doctor / Hospital Medicine

### 20 Participant Users
All seeded participants share the same default password: `TestPass123!`
Emails follow the pattern: `<firstname>.<lastname>@biomedmeet.demo`
(e.g. `aarav.sharma@biomedmeet.demo`, `priya.patel@biomedmeet.demo`, ...)

### Seeded volumes
- 21 users (1 organizer + 20 participants)
- 25 patients (MRN-01001 .. MRN-01025)
- 12 meetings (3 one-time / 3 daily / 3 weekly / 3 monthly-on first Mon/Tue/Thu)
- 50 agenda items (each patient appears twice across meetings)
- All seeded rows are tagged `_seed: "demo_v1"`

### Re-seed / reset
```
python /app/scripts/seed_demo_data.py            # idempotent insert
python /app/scripts/seed_demo_data.py --purge    # wipe demo_v1 rows first
```
