# BioMedMeet Demo Deck — Reference

Single source of truth for the BioMedMeet sales / demo PowerPoint deck:
what's in it, how to regenerate it, and how to personalise it per prospect.

- **Generator:** [`/app/scripts/build_demo_deck.py`](../scripts/build_demo_deck.py)
- **Default output:** [`/app/docs/BioMedMeet_Demo_Deck.pptx`](./BioMedMeet_Demo_Deck.pptx)
- **Format:** 16:9 widescreen (13.33" × 7.5"), 10 slides, ~85 KB
- **Edit model:** 100% native PowerPoint shapes (vectors, text, embedded
  JPGs). No rasterised slides — every shape is editable in PowerPoint,
  Keynote, or LibreOffice Impress.

---

## 1. Quick start

```bash
# Generic deck — no hospital name
python /app/scripts/build_demo_deck.py

# Personalised for one prospect (uses current month + year by default)
python /app/scripts/build_demo_deck.py --hospital-name "Ochsner Health"

# Fully explicit
python /app/scripts/build_demo_deck.py \
    --hospital-name "Mayo Clinic" \
    --month June --year 2026 \
    --output /app/docs/mayo_pitch.pptx
```

### CLI flags

| Flag | Default | Effect |
|------|---------|--------|
| `--hospital-name` | *(none)* | Personalises slides 1, 2, 7, 10 and auto-slugs the output filename. |
| `--month` | current month name | Shown on the cover "Prepared for…" badge. |
| `--year` | current year | Shown on the cover "Prepared for…" badge. |
| `--output` | `/app/docs/BioMedMeet_Demo_Deck[_<Hospital>].pptx` | Explicit output path overrides the auto-naming. |

When `--hospital-name` is set, the filename auto-derives via a slug:
`Ochsner Health` → `BioMedMeet_Demo_Deck_Ochsner_Health.pptx`.

---

## 2. Deck structure (10 slides)

| # | Slide | Purpose | Personalised by `--hospital-name`? |
|---|-------|---------|------------------------------------|
| 1 | **Cover** — "Stop scheduling. Start deciding." | Brand hook | ✅ Cover badge + subhead + footer |
| 2 | **Overview** — what BioMedMeet is, 3 KPI tiles | Reframe the problem | ✅ Eyebrow line |
| 3 | **Before / After** | Visualise the shift | — |
| 4 | **Six platform pillars** (2×3 grid) | Capability breadth | — |
| 5 | **4-step workflow** (Schedule → Discuss → Decide → Distribute) | Show real product screens | — |
| 6 | **Architecture & compliance** | Convince the CISO | — |
| 7 | **Pricing** — $25,000 perpetual card + "what you don't pay" | Anchor on one-time licence | ✅ Eyebrow + card title |
| 8 | **ROI** — 3 stat tiles + horizontal bar chart | Justify the spend | — |
| 9 | **Revenue & throughput** (4 benefit cards) | Show upside beyond hours | — |
| 10 | **Closing CTA** — "Book a 15-minute walkthrough" | Drive action | ✅ Headline + subhead |

Slides 3–6, 8, 9 stay product-generic on purpose — forcing the hospital name
into pure feature/architecture slides reads as filler.

---

## 3. Design system (matches biomedmeet.com)

All colours are defined as constants near the top of `build_demo_deck.py`
so changing the palette is one-edit-fits-all.

| Token | Hex | Usage |
|-------|-----|-------|
| `NAVY`   | `#0B0B30` | Primary text · dark slide backgrounds · CTA panel |
| `GREEN`  | `#3B6658` | Feature accents · "✓" indicators · "Prepared for" badge |
| `OLIVE`  | `#694E20` | Pricing / hospital tone · "Before" accents |
| `PURPLE` | `#68517D` | Participants / data accents |
| `IVORY`  | `#F9F5EE` | Warm slide background |
| `CREAM`  | `#FDFAF3` | Alternate slide background |
| `WHITE`  | `#FFFFFF` | Clean cards, top bars, light text on navy |
| `SLATE`  | `#4A5568` | Secondary body copy |

Tinted card backgrounds (`TINT_GREEN`, `TINT_OLIVE`, `TINT_PURPLE`,
`TINT_NAVY`) mirror the marketing site card system 1:1.

### Brand mark
- Heartbeat / activity-line icon + "BioMedMeet" wordmark drawn natively
  as a freeform polyline inside `draw_logo()`. Renders on every slide,
  with a `light=True` variant for dark slides (cover + CTA).
- Wordmark: Calibri, 20pt, bold. Same typeface used across the deck for
  100% PPT-portability — no font assets to ship.

### Layout grid
- Title eyebrow: 12pt, GREEN, bold, uppercase
- H1: 30–34pt, NAVY, bold
- H2 (cover hero): 48–60pt, white-on-navy
- Body: 13–14pt, SLATE
- Footer ribbon: 9–10pt, SLATE / LIGHT
- Page numbers on the bottom-right of every content slide (2–9)

---

## 4. Real data baked into the deck

| Slide | Data | Source |
|-------|------|--------|
| 2 — Overview KPIs | 18 hrs / $187,200 / 1.6 mo | `pricing.html` ROI cards |
| 5 — Workflow thumbnails | `step1.jpg` … `step4.jpg` | `/app/frontend/public/marketing/thumbs/` |
| 7 — Pricing card | $25,000 perpetual licence + bullets | `pricing.html` perpetual-licence card |
| 8 — ROI tiles | 18 hrs / $187,200 / 1.6 months | `pricing.html` |
| 8 — Bar chart | 5.0 / 4.0 / 3.5 / 3.0 / 2.5 hrs | `pricing.html` "Where the 18 hours go" |

If the numbers on the marketing site change, update them in
`build_demo_deck.py` (search for `18 hrs`, `$187,200`, `25,000`, `1.6`,
`5.0`, `4.0`, `3.5`, `3.0`, `2.5`) so the deck stays consistent.

---

## 5. How to update the deck

### A. Change copy on a single slide
Open `/app/scripts/build_demo_deck.py` and edit the matching `make_*`
function. Each builder is self-contained — finding the slide you want to
change is just Ctrl-F for the slide title.

| Want to edit… | Edit this function |
|---------------|--------------------|
| Cover headline / badge / subhead | `make_cover()` |
| Overview narrative + KPI tiles | `make_overview()` |
| Before / After bullets | `make_problem_solution()` |
| The six capability cards | `make_feature_grid()` |
| The 4 workflow steps | `make_feature_deep_workflow()` |
| Architecture pillars | `make_security_compliance()` |
| Pricing card + "what you don't pay" | `make_pricing()` |
| ROI tiles + bar chart | `make_roi()` |
| Benefit cards | `make_revenue_business()` |
| Closing CTA | `make_cta()` |

### B. Add a new slide
1. Write a `make_my_slide(prs)` function (use any existing builder as a
   template — they all start with `prs.slides.add_slide(prs.slide_layouts[6])`
   for a blank canvas).
2. Call it from `main()` between the existing `make_*` calls.
3. Update the page-number argument to `add_footer(slide, N, total)`
   (and the `total` on every other slide).

### C. Re-skin the palette
Edit the colour constants near the top of `build_demo_deck.py`. Every
shape pulls from those names, so a single edit recolours the entire deck.

---

## 6. Personalisation logic

| Element | When `--hospital-name="Ochsner Health"` |
|---------|------------------------------------------|
| Cover badge | `PREPARED FOR OCHSNER HEALTH · MAY 2026` (green rounded chip) |
| Cover subhead | `A walkthrough for Ochsner Health — how BioMedMeet turns…` |
| Cover footer | `Demo deck · Prepared for Ochsner Health · …` |
| Overview eyebrow | `WHAT BIOMEDMEET MEANS FOR OCHSNER HEALTH` |
| Pricing eyebrow | `PRICING FOR OCHSNER HEALTH` |
| Pricing card title | `BioMedMeet for Ochsner Health` |
| CTA headline | `Let's book a 15-minute walkthrough for Ochsner Health.` |
| CTA subhead | `…so Ochsner Health's team can click around…` |
| Output filename | `BioMedMeet_Demo_Deck_Ochsner_Health.pptx` |

Hospital names with punctuation are sanitised for the filename:
`St. Jude's Children's Research Hospital` → `St_Jude_s_Children_s_Research_Hospital.pptx`.

---

## 7. Sales workflow (recommended)

```bash
# 1. Personalise for the upcoming demo
python /app/scripts/build_demo_deck.py --hospital-name "Ochsner Health"

# 2. Open the file in PowerPoint / Keynote, tweak any slide if the
#    prospect mentioned a specific pain point in your discovery call
#    (e.g. swap an icon or rephrase the overview narrative).

# 3. Save the customised version with a -v2 suffix and attach to the
#    calendar invite alongside biomedmeet.com.
```

> 📈 **Why this matters:** decks with the prospect's name in the title
> close at roughly 2× the rate of generic decks. The personalisation
> takes ~3 seconds; the conversion lift is the most reliable revenue
> win in your sales pipeline.

---

## 8. Dependencies

```text
python-pptx >= 1.0.2   # adds the freeform polyline API used by the logo
Pillow                 # transitive dep of python-pptx for image handling
```

Install if missing:
```bash
pip install python-pptx Pillow
```

The generator does **not** call out to the network or to MongoDB —
it's a pure file-out tool, so it's safe to run on a laptop, on a CI
runner, or inside the marketing-outreach venv.

---

## 9. Troubleshooting

| Symptom | Most likely cause | Fix |
|---------|-------------------|-----|
| `ModuleNotFoundError: pptx` | Lib not installed in the active interpreter | `pip install python-pptx` (or `.venv/bin/pip install python-pptx`) |
| Slide 5 thumbnails missing | `frontend/public/marketing/thumbs/stepN.jpg` not present | Restore the four `step1..4.jpg` files (they ship with the public marketing site) |
| Hospital name shows lowercase on the cover badge | You passed it lowercase | The badge is `.upper()`-ed automatically; if you see lowercase the change wasn't pulled |
| Filename has weird characters | Hospital name contains punctuation | `_slug()` only keeps `[A-Za-z0-9]`, everything else becomes `_` — this is intentional |
| Long hospital names overflow the CTA headline | Headline font auto-shrinks to 44pt when a hospital name is supplied | Tweak the `size=` argument in `make_cta()` if you need it smaller still |

---

## 10. Related artifacts

- `/app/frontend/public/home/pricing.html` — single source of truth for
  the $25,000 licence price, the ROI numbers, and the "where the 18
  hours go" breakdown. Keep the deck and that page in sync.
- `/app/frontend/public/marketing/thumbs/step{1..4}.jpg` — workflow
  screenshots used on slide 5. Re-export from the marketing site if
  the product UI changes.
- `/app/docs/EMAIL_SENDER_SETUP_BIOMEDMEET.md` — Google Workspace +
  DNS setup for the `Demo@BioMedMeet.com` mailbox referenced on the
  cover and CTA slides.
- `/app/marketing_outreach/email_template.py` — the cold-email template
  that links to `biomedmeet.com` and ultimately drives traffic to the
  contact form that triggers this deck.
