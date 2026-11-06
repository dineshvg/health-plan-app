"""Checks for skill/scripts/targets.py.   python3 tests/test_targets.py"""
import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "skill" / "scripts"))
from targets import compute  # noqa: E402

D = dt.date.fromisoformat
MON = D("2026-11-09")
fails = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        fails.append(msg)


def run(**kw):
    base = dict(sex="m", age=40, height=180, weight=92, goal_weight=84, start=MON, goal_date=D("2027-05-31"), activity=1.375)
    base.update(kw)
    return compute(**base)


r = run()
check(r["bmr"] == 1850, f"BMR Mifflin-St Jeor male = 1850 (got {r['bmr']})")
check(r["tdee"] == round(1850 * 1.375), "TDEE = BMR x activity")
check(250 < r["deficit"] <= 500 and r["goalDate"] == "2027-05-31", "needed 250-500: deficit = needed, date kept")
check(len(r["milestones"]) == 4 and r["milestones"][-1] == ["Goal", "2027-05-31", 84], "4 milestones ending at the goal")
check(r["protein"] == {"min": 134, "max": 168, "use": 151}, "protein 1.6-2.0 g/kg goal weight")

r = run(goal_date=D("2027-12-31"))
check(r["deficit"] == 250 and r["goalDate"] == "2027-12-31", "needed <= 250: 250, keep their date")

r = run(goal_date=D("2027-02-15"))
check(r["deficit"] == 500 and r["goalDate"] > "2027-02-15", "needed 500-750: 500 and date slips")
r2 = run(goal_date=D("2027-02-15"), harder=True)
check(500 < r2["deficit"] <= 750 and r2["goalDate"] == "2027-02-15", "--harder: needed up to 750, date kept")

r = run(goal_date=D("2026-12-07"))
check(r["deficit"] == 500 and any("unrealistic" in n for n in r["notes"]), "crash goal: 500 + new date")

r = run(cautious=True)
check(r["deficit"] == 250, "--cautious: 250")

r = run(age=16)
check(r["status"] == "refused", "under 18 refused")
r = run(height=170, goal_weight=50)
check(r["status"] == "refused", "goal BMI < 18.5 refused")
r = run(start=D("2026-11-10"))
check(r["status"] == "refused", "non-Monday start refused")

r = run(sex="f", age=30, height=160, weight=55, goal_weight=53, activity=1.2, goal_date=D("2027-01-04"))
check(r["status"] == "ok" and r["targetKcal"] >= r["bmr"], "target never below BMR")

r = run(goal_weight=95)
check(r["mode"] == "gain" and r["surplus"] == 250, "gain: +250 surplus")

print("OK" if not fails else f"{len(fails)} problem(s)")
sys.exit(1 if fails else 0)
