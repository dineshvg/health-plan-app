"""Compute the plan's numbers deterministically. Never do this arithmetic by hand.

    python3 targets.py --sex m --age 41 --height 180 --weight 92 --goal-weight 82 \
        --start 2026-11-09 --goal-date 2027-05-31 --activity desk-light
    python3 targets.py ... --cautious        # a health condition: smallest deficit (250)
    python3 targets.py ... --harder          # person accepted a harder plan (needed 500-750)

Prints JSON. Exit 0 = ok, 2 = refused (do not build a deficit plan; explain "reason" to the person).

Rules (Mifflin-St Jeor, 7700 kcal per kg):
  needed = kg to lose x 7700 / days from start to goal date
  needed <= 250        -> 250 (arrives early, fine)
  250 < needed <= 500  -> needed
  500 < needed <= 750  -> 500 and the date slips (or needed with --harder)
  > 750 or > 1 % body weight/week (weight x 11 kcal/day) -> unrealistic: 500 and a new date
  target = TDEE - deficit, never below BMR. Gain: +250 surplus. Protein 1.6-2.0 g per kg goal weight.
"""
import argparse
import datetime as dt
import json
import math
import sys

KCAL_PER_KG = 7700
ACTIVITY = {
    "desk": 1.2,          # desk job, little exercise
    "desk-light": 1.375,  # desk job + 2-3 workouts per week
    "feet": 1.55,         # on-your-feet job or 4-5 workouts per week
    "very": 1.725,        # very active
}


def r5(x):
    """Round to the nearest 0.5 kg."""
    return round(x * 2) / 2


def compute(sex, age, height, weight, goal_weight, start, goal_date, activity, cautious=False, harder=False):
    out = {"status": "ok", "notes": []}
    if age < 18:
        return {"status": "refused", "reason": "Under 18: no calorie-deficit or weight-loss plan. Suggest talking to a GP or school nurse; a general activity plan without calorie targets is fine."}
    goal_bmi = goal_weight / (height / 100) ** 2
    if goal_bmi < 18.5:
        return {"status": "refused", "reason": f"Goal weight gives BMI {goal_bmi:.1f}, under 18.5 (underweight). Do not plan towards it; suggest a GP conversation."}
    if start.weekday() != 0:
        return {"status": "refused", "reason": f"startDate {start} is not a Monday; pick the next Monday."}

    bmr = 10 * weight + 6.25 * height - 5 * age + (5 if sex == "m" else -161)
    tdee = bmr * activity
    out.update(bmr=round(bmr), activityFactor=activity, tdee=round(tdee))

    kg = weight - goal_weight
    days = (goal_date - start).days
    if days <= 0:
        return {"status": "refused", "reason": "Goal date is not after the start date."}

    if kg < 0:  # muscle gain
        delta = 250
        target = tdee + delta
        out["mode"] = "gain"
        out["notes"].append("Muscle gain: +250 kcal surplus (range 200-300).")
    elif kg == 0:
        delta, target = 0, tdee
        out["mode"] = "maintain"
    else:
        out["mode"] = "loss"
        needed = kg * KCAL_PER_KG / days
        cap = weight * 11  # 1 % of body weight per week
        out["neededDeficit"] = round(needed)
        if cautious:
            delta = 250
            out["notes"].append("Health condition: smallest deficit (250) used; check with GP first.")
        elif needed > 750 or needed > cap:
            delta = 500
            out["notes"].append(f"Goal date unrealistic (needs {round(needed)} kcal/day). Proposing the date a 500 deficit gives.")
        elif needed > 500:
            delta = min(needed, 750) if harder else 500
            if not harder:
                out["notes"].append("Needs 500-750 kcal/day: using 500, so the date slips. Offer --harder (up to 750) if they accept a harder plan.")
        elif needed > 250:
            delta = needed
        else:
            delta = 250
            out["notes"].append("Small deficit needed: using 250, they will arrive early.")
        target = tdee - delta
        if target < bmr:
            target = bmr
            delta = tdee - bmr
            out["notes"].append("Target clamped to BMR; deficit reduced.")
            if delta <= 0:
                return {"status": "refused", "reason": "TDEE is at or below BMR with this activity factor; no safe deficit. Raise activity (steps) instead of cutting food."}

    out["deficit" if out["mode"] == "loss" else "surplus"] = round(abs(delta))
    out["targetKcal"] = int(round(target / 10) * 10)
    out["protein"] = {"min": round(1.6 * goal_weight), "max": round(2.0 * goal_weight), "use": round(1.8 * goal_weight)}

    if out["mode"] == "maintain":
        out["goalDate"] = goal_date.isoformat()
        out["milestones"] = []
        return out

    rate = delta * 7 / KCAL_PER_KG  # kg/week
    out["rateKgPerWeek"] = round(rate, 2)
    agreed_days = math.ceil(abs(kg) * KCAL_PER_KG / delta)
    agreed = start + dt.timedelta(days=agreed_days)
    if out["mode"] == "loss" and agreed <= goal_date:
        agreed = goal_date  # arriving early is fine; keep their date
    out["goalDate"] = agreed.isoformat()
    if agreed != goal_date:
        out["notes"].append(f"Projected goal date: {agreed.isoformat()} (asked for {goal_date.isoformat()}). Agree this with the person.")

    # up to 4 milestones on a straight line, the last one is the goal
    total = (agreed - start).days
    n = 4 if total >= 112 else 2 if total >= 42 else 1
    ms = []
    for i in range(1, n + 1):
        d = start + dt.timedelta(days=round(total * i / n))
        w = goal_weight if i == n else r5(weight - kg * i / n)
        ms.append(["Goal" if i == n else f"Milestone {i}", d.isoformat(), w])
    out["milestones"] = ms
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sex", choices=["m", "f"], required=True)
    ap.add_argument("--age", type=int, required=True)
    ap.add_argument("--height", type=float, required=True, help="cm")
    ap.add_argument("--weight", type=float, required=True, help="kg now")
    ap.add_argument("--goal-weight", type=float, required=True, help="kg")
    ap.add_argument("--start", required=True, help="YYYY-MM-DD, a Monday")
    ap.add_argument("--goal-date", required=True, help="YYYY-MM-DD")
    ap.add_argument("--activity", required=True, help=f"{', '.join(ACTIVITY)} or a number (if unsure between two, pick the lower)")
    ap.add_argument("--cautious", action="store_true", help="health condition: smallest deficit")
    ap.add_argument("--harder", action="store_true", help="person accepted up to 750 kcal/day")
    a = ap.parse_args(argv)
    act = ACTIVITY.get(a.activity) or float(a.activity)
    res = compute(a.sex, a.age, a.height, a.weight, a.goal_weight,
                  dt.date.fromisoformat(a.start), dt.date.fromisoformat(a.goal_date), act, a.cautious, a.harder)
    print(json.dumps(res, indent=2))
    return 0 if res["status"] == "ok" else 2


if __name__ == "__main__":
    sys.exit(main())
