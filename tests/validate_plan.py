"""Check app/plan.json before publishing.

    python3 tests/validate_plan.py                       # uses app/plan.json
    python3 tests/validate_plan.py app/plan.json --exclude chicken,beef,peanut --private ../my-plans/tracker/settings.json

Fails (exit 1) on: missing meal keys, days outside +/-10 % of the kcal target, days under 90 % of the
protein target, unknown categories, excluded words anywhere in the plan, private values from the settings
anywhere in the plan, or training days that don't match the tracker's sessions.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("plan", nargs="?", default=str(ROOT / "app" / "plan.json"))
ap.add_argument("--exclude", default="", help="comma-separated words that must not appear anywhere in the plan (diet, allergies)")
ap.add_argument("--private", help="private tracker settings JSON; none of its personal values may appear in plan.json")
a = ap.parse_args()

p = json.loads(Path(a.plan).read_text())
errors = []


def strings(x):
    """Every string value in the plan (keys excluded), lower-cased."""
    if isinstance(x, str):
        yield x.lower()
    elif isinstance(x, dict):
        for v in x.values():
            yield from strings(v)
    elif isinstance(x, list):
        for v in x:
            yield from strings(v)


ALL = list(strings(p))
TEXT = "\n".join(ALL)

for key in ("tracker", "person"):
    if key in p:
        errors.append(f'plan.json has a "{key}" section: personal settings belong in the private tracker settings')

# meal references and daily totals
M = p["meals"]
days = []
for wi, week in enumerate(p["weeks"], 1):
    if len(week) != 7:
        errors.append(f"week {wi} has {len(week)} days, needs 7 (Mon..Sun)")
    for di, day in enumerate(week):
        bad = [s for s in "blsd" if not day.get(s) or day[s].lstrip("@") not in M]
        for s in bad:
            errors.append(f"week {wi} day {di + 1} {s}: unknown meal {day.get(s)!r}")
        if day.get("batch") and day["batch"] not in M:
            errors.append(f"week {wi} day {di + 1}: unknown batch meal {day['batch']!r}")
        if bad:
            continue
        kcal = sum(M[day[s].lstrip("@")]["kcal"] for s in "blsd")
        prot = sum(M[day[s].lstrip("@")]["protein"] for s in "blsd")
        tk, tp = p["target"]["kcal"], p["target"]["protein"]
        if abs(kcal - tk) > 0.1 * tk:
            errors.append(f"week {wi} day {di + 1}: {kcal} kcal is outside +/-10 % of {tk}")
        if prot < 0.9 * tp:
            errors.append(f"week {wi} day {di + 1}: {prot} g protein is under 90 % of {tp}")
        days.append((kcal, prot))

cats = set(p["categories"])
for k, m in M.items():
    for it in m.get("buy", []):
        if it["cat"] not in cats:
            errors.append(f"meal {k}: buy item {it['name']!r} has unknown category {it['cat']!r}")
for it in p["pantry"]:
    if it["cat"] not in cats:
        errors.append(f"pantry {it['name']!r} has unknown category {it['cat']!r}")


def find(word):
    """Lines of the plan containing word (word start, case-insensitive)."""
    rx = re.compile(r"(?<![a-z])" + re.escape(word.lower()))
    return [s for s in ALL if rx.search(s)]


for word in filter(None, (w.strip() for w in a.exclude.split(","))):
    for hit in find(word)[:3]:
        errors.append(f"excluded {word!r} found in: {hit[:80]!r}")

if a.private:
    s = json.loads(Path(a.private).read_text())
    h = s.get("habit", {})
    words = list(s.get("privateWords", [])) + [h.get("label"), h.get("weekly"), h.get("freeDays")]
    if s.get("name") and s["name"].lower() != p.get("name", "").lower():
        words.append(s["name"])
    words += [s.get("goalDate")] + [m[1] for m in s.get("milestones", [])]  # dates
    for v in filter(None, words):
        for hit in find(str(v))[:2]:
            errors.append(f"private value {v!r} found in plan.json: {hit[:80]!r}")
    for num in sorted({float(x) for x in [s.get("startWeight"), s.get("goalWeight")] + [m[2] for m in s.get("milestones", [])] if x}):
        n = re.escape(f"{num:g}")
        if re.search(rf"(?<![\d.]){n}(\.0)?\s*(kg|kilo)", TEXT):
            errors.append(f"weight {num:g} kg from the private settings appears in plan.json")
    # training days in the plan vs the tracker's sessions
    plan_days = sorted({(d.get("training"), i) for w in p["weeks"] for i, d in enumerate(w) if d.get("training")})
    sess_days = sorted({(x["code"], x["dayOffset"]) for x in s.get("sessions", [])})
    if plan_days and sess_days and set(plan_days) != set(sess_days):
        errors.append(f"training days in plan.json {plan_days} don't match tracker sessions {sess_days} (code, weekday 0=Mon)")

if days:
    ks = [k for k, _ in days]
    ps = [q for _, q in days]
    print(f"{len(days)} days: {min(ks)}-{max(ks)} kcal (avg {sum(ks) // len(ks)}), {min(ps)}-{max(ps)} g protein")
for e in errors:
    print("FAIL", e)
print("OK" if not errors else f"{len(errors)} problem(s)")
sys.exit(1 if errors else 0)
