"""Check app/plan.json before publishing.

    python tests/validate_plan.py                       # uses app/plan.json
    python tests/validate_plan.py app/plan.json --exclude chicken,beef,salmon --private tracker/settings.json

Fails (exit 1) on: missing meal keys, days outside +/-10 % of the kcal target, days under 90 % of the
protein target, excluded ingredients, or personal data that belongs in the private settings.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("plan", nargs="?", default=str(ROOT / "app" / "plan.json"))
ap.add_argument("--exclude", default="", help="comma-separated words that must not appear in meals (diet/allergies)")
ap.add_argument("--private", help="private settings JSON; none of its personal values may appear in plan.json")
a = ap.parse_args()

text = Path(a.plan).read_text()
p = json.loads(text)
errors, notes = [], []

for key in ("tracker", "person"):
    if key in p:
        errors.append(f'plan.json has a "{key}" section: personal settings belong in the private tracker settings')

M = p["meals"]
for wi, week in enumerate(p["weeks"], 1):
    if len(week) != 7:
        errors.append(f"week {wi} has {len(week)} days, needs 7 (Mon..Sun)")
    for di, day in enumerate(week):
        for slot in "blsd":
            ref = day.get(slot)
            if not ref or ref.lstrip("@") not in M:
                errors.append(f"week {wi} day {di + 1} {slot}: unknown meal {ref!r}")
        if day.get("batch") and day["batch"] not in M:
            errors.append(f"week {wi} day {di + 1}: unknown batch meal {day['batch']!r}")
        if errors:
            continue
        kcal = sum(M[day[s].lstrip("@")]["kcal"] for s in "blsd")
        prot = sum(M[day[s].lstrip("@")]["protein"] for s in "blsd")
        tk, tp = p["target"]["kcal"], p["target"]["protein"]
        if abs(kcal - tk) > 0.1 * tk:
            errors.append(f"week {wi} day {di + 1}: {kcal} kcal is outside +/-10 % of {tk}")
        if prot < 0.9 * tp:
            errors.append(f"week {wi} day {di + 1}: {prot} g protein is under 90 % of {tp}")
        notes.append((kcal, prot))

cats = set(p["categories"])
for k, m in M.items():
    for it in m.get("buy", []):
        if it["cat"] not in cats:
            errors.append(f"meal {k}: buy item {it['name']!r} has unknown category {it['cat']!r}")
for it in p["pantry"]:
    if it["cat"] not in cats:
        errors.append(f"pantry {it['name']!r} has unknown category {it['cat']!r}")

for word in filter(None, (w.strip().lower() for w in a.exclude.split(","))):
    for k, m in M.items():
        blob = (m["name"] + " " + m["how"] + " " + " ".join(i["name"] for i in m.get("buy", []))).lower()
        if re.search(r"\b" + re.escape(word), blob):
            errors.append(f"meal {k} mentions excluded {word!r}")
    for it in p["pantry"]:
        if re.search(r"\b" + re.escape(word), it["name"].lower()):
            errors.append(f"pantry item {it['name']!r} mentions excluded {word!r}")

if a.private:
    s = json.loads(Path(a.private).read_text())
    personal = [s.get("goalDate"), s.get("habit", {}).get("label")] + [m[0] for m in s.get("milestones", [])]
    for v in filter(None, personal):
        if str(v).lower() in text.lower():
            errors.append(f"plan.json contains a private value: {v!r}")
    for num in (s.get("startWeight"), s.get("goalWeight")):
        if num is not None and re.search(rf'"(weight|startWeight|goalWeight)"\s*:\s*{num}\b', text):
            errors.append(f"plan.json contains a weight from the private settings: {num}")

if notes:
    ks = [k for k, _ in notes]
    ps = [q for _, q in notes]
    print(f"{len(notes)} days: {min(ks)}-{max(ks)} kcal (avg {sum(ks) // len(ks)}), {min(ps)}-{max(ps)} g protein")
for e in errors:
    print("FAIL", e)
print("OK" if not errors else f"{len(errors)} problem(s)")
sys.exit(1 if errors else 0)
