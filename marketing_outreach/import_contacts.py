#!/usr/bin/env python3
"""
Import contact CSVs exported from Apollo.io / ZoomInfo / Hunter.io / generic
LinkedIn-sourced spreadsheets and normalise them to the BioMedMeet schema.

Output CSV columns (the only ones send_campaign.py reads):
    hospital_name, digital_team_name, contact_person, contact_first_name,
    contact_email, phone, country

USAGE
=====
    # Auto-detect the source format from the header row
    python3 import_contacts.py --input apollo_export.csv --country US \
                               --output healthcare_us.csv

    # Force a specific source (for ambiguous headers)
    python3 import_contacts.py --input some.csv --source apollo --country US \
                               --output healthcare_us.csv

    # Merge multiple sources together
    python3 import_contacts.py --input apollo.csv zoominfo.csv hunter.csv \
                               --country US --output healthcare_us.csv
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

# Source-specific column mappings (lower-cased CSV headers → our schema)
SOURCE_MAPPINGS = {
    # Apollo.io CSV export (Person + Company export format)
    "apollo": {
        "hospital_name":       ["company", "company name"],
        "digital_team_name":   ["department"],
        "contact_person":      ["first name", "last name"],   # combined
        "contact_first_name":  ["first name"],
        "contact_email":       ["email"],
        "phone":               ["mobile phone", "work direct phone", "corporate phone"],
        "country":             ["country", "person country"],
    },
    # ZoomInfo CSV export
    "zoominfo": {
        "hospital_name":       ["company name", "company"],
        "digital_team_name":   ["department", "job function"],
        "contact_person":      ["first name", "last name"],
        "contact_first_name":  ["first name"],
        "contact_email":       ["email address", "email"],
        "phone":               ["direct phone", "mobile phone", "company hq phone"],
        "country":             ["country", "company country"],
    },
    # Hunter.io CSV export
    "hunter": {
        "hospital_name":       ["organization", "company"],
        "digital_team_name":   ["department"],
        "contact_person":      ["first_name", "last_name"],
        "contact_first_name":  ["first_name"],
        "contact_email":       ["email"],
        "phone":               ["phone_number", "phone"],
        "country":             ["country"],
    },
    # LinkedIn Sales Navigator export (CSV format)
    "linkedin": {
        "hospital_name":       ["company", "current company"],
        "digital_team_name":   ["title", "current title"],
        "contact_person":      ["first name", "last name"],
        "contact_first_name":  ["first name"],
        "contact_email":       ["email"],
        "phone":               ["phone"],
        "country":             ["country", "location"],
    },
    # Generic / our own template
    "biomedmeet": {
        "hospital_name":       ["hospital_name", "hospital name", "organization", "company"],
        "digital_team_name":   ["digital_team_name", "digital team name", "team", "department"],
        "contact_person":      ["contact_person", "contact person", "full name", "name"],
        "contact_first_name":  ["contact_first_name", "first name", "firstname"],
        "contact_email":       ["contact_email", "email", "email address"],
        "phone":               ["phone", "phone number"],
        "country":             ["country"],
    },
}

OUTPUT_FIELDS = [
    "hospital_name",
    "digital_team_name",
    "contact_person",
    "contact_first_name",
    "contact_email",
    "phone",
    "country",
]


def detect_source(headers: set[str]) -> str:
    """Guess which tool produced this CSV based on tell-tale headers."""
    if "email address" in headers and ("direct phone" in headers or "company hq phone" in headers):
        return "zoominfo"
    if "email" in headers and "company" in headers and ("seniority" in headers or "industry" in headers) and "title" in headers:
        return "apollo"
    if {"first_name", "last_name", "email"}.issubset(headers):
        return "hunter"
    if "current company" in headers or "current title" in headers:
        return "linkedin"
    return "biomedmeet"


def first_present(row: dict, candidates: list[str]) -> str:
    for c in candidates:
        v = (row.get(c) or "").strip()
        if v:
            return v
    return ""


def transform_row(row: dict, mapping: dict, default_country: str) -> dict | None:
    lowered = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
    email = first_present(lowered, mapping["contact_email"])
    if not email or "@" not in email:
        return None  # drop rows without an email

    first = first_present(lowered, mapping["contact_first_name"])
    last = (lowered.get("last name") or lowered.get("last_name") or "").strip()
    full_name = first_present(lowered, mapping["contact_person"])
    if not full_name and (first or last):
        full_name = f"{first} {last}".strip()

    return {
        "hospital_name":      first_present(lowered, mapping["hospital_name"]),
        "digital_team_name":  first_present(lowered, mapping["digital_team_name"]),
        "contact_person":     full_name,
        "contact_first_name": first,
        "contact_email":      email.lower(),
        "phone":              first_present(lowered, mapping["phone"]),
        "country":            first_present(lowered, mapping["country"]) or default_country,
    }


def load_and_transform(path: Path, source: str | None, default_country: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        headers = {(h or "").strip().lower() for h in (reader.fieldnames or [])}
        detected = source or detect_source(headers)
        mapping = SOURCE_MAPPINGS.get(detected, SOURCE_MAPPINGS["biomedmeet"])
        out = []
        for raw in reader:
            t = transform_row(raw, mapping, default_country)
            if t:
                out.append(t)
        print(f"  · {path.name}: source={detected}  rows={len(out)}")
        return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--input", nargs="+", required=True, type=Path)
    p.add_argument("--source", choices=list(SOURCE_MAPPINGS.keys()), default=None,
                   help="Force the source format. If omitted, auto-detected.")
    p.add_argument("--country", required=True,
                   help="Default country if a row doesn't have one (US, UK, IN, EU, …).")
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--dedup", action="store_true", default=True,
                   help="Deduplicate by email (default: on).")
    args = p.parse_args()

    all_rows: list[dict] = []
    for inp in args.input:
        if not inp.exists():
            print(f"!! missing input: {inp}")
            continue
        all_rows.extend(load_and_transform(inp, args.source, args.country.upper()))

    if args.dedup:
        seen, deduped = set(), []
        for r in all_rows:
            if r["contact_email"] in seen:
                continue
            seen.add(r["contact_email"])
            deduped.append(r)
        print(f"  · deduplicated: {len(all_rows)} → {len(deduped)} rows")
        all_rows = deduped

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=OUTPUT_FIELDS)
        w.writeheader()
        for r in all_rows:
            w.writerow(r)
    print(f"✅ wrote {len(all_rows)} rows → {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
