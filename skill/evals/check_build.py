"""Deterministic checks for a full-build eval run (persona 1, stages 1-9; answers in full-build-persona1.md).

    python3 skill/evals/check_build.py <run-dir> [validator.py]

<run-dir> holds plans-repo/ (private), app-repo/ (public, from the template) and log.md.
Uses CHROMIUM_PATH for the smoke test, like npm test.
"""
import json, os, re, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

R = Path(sys.argv[1]); P = R / "plans-repo"; A = R / "app-repo"
SKILL = str(REPO / "skill" / "scripts" / "targets.py")
VALIDATOR = sys.argv[2] if len(sys.argv) > 2 else str(REPO / "tests" / "validate_plan.py")
CHROME = os.environ.get("CHROMIUM_PATH", "")
MEAT = "chicken,beef,pork,lamb,mutton,fish,salmon,tuna,cod,shrimp,prawn,ham,bacon,mince,turkey,sausage,anchov,gelatin,mushroom,chorizo,salami"
PERSONAL = ["raj", "priya", "hamburg", "nurse", "amlodipine", "blood pressure", "hypertension", "rajexample", "@gmail", "98 kg", "88 kg", "2027-09-30"]
res = []


def check(name, ok, detail=""):
    res.append({"check": name, "pass": bool(ok), "detail": detail})


def read(p):
    return p.read_text(errors="ignore") if p.exists() else ""


def find_one(base, name):
    hits = [p for p in base.rglob(name) if "node_modules" not in p.parts and "skill" not in p.parts]
    return hits[0] if hits else None

# --- private side
status = find_one(P, "STATUS.md"); st = read(status) if status else ""
check("STATUS.md in private repo", status)
stage_rows = re.findall(r"^\|\s*(\d)\s*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|", st, re.M)
done = [n for n, s in stage_rows if s.lower().startswith("done")]
check("STATUS.md: stages 1-9 done", len(done) == 9, f"done={done}")
check("STATUS.md: no health detail (medication/condition names)", not re.search(r"amlodipine|blood pressure|hypertension|\bBP\b", st, re.I))
check("STATUS.md: BMR recorded", re.search(r"BMR[^\n]*\d,?\d{3}", st))
check("STATUS.md: sheet ID + app URL", "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdEFG" in st and "rajexample.github.io/health-plan" in st)

tr = read(find_one(P, "training.md") or Path("/x"))
check("training.md exists", tr)
check("training.md: deload weeks 4 and 8, test week 12", re.search(r"deload", tr, re.I) and re.search(r"\b4\b", tr) and re.search(r"\b8\b", tr) and re.search(r"test", tr, re.I) and "12" in tr)
check("training.md: A->B->C sequence for shift work", re.search(r"sequence|next session on (any|the next) free day", tr, re.I))
check("training.md: RPE <= 7 and no max tests", re.search(r"RPE[^\n]{0,30}7", tr) and re.search(r"no (max|maximal)|sub-?max", tr, re.I))
check("training.md: GP check", re.search(r"\bGP\b|doctor", tr, re.I))
fd = read(find_one(P, "food.md") or Path("/x"))
check("food.md: working shown (BMR, TDEE)", re.search(r"BMR", fd) and re.search(r"TDEE|1\.55", fd))
check("food.md: low-salt rule", re.search(r"salt", fd, re.I))

sp = find_one(P, "settings.json"); s = json.loads(read(sp)) if sp else {}
check("settings.json in private repo", s)
tj = json.loads(subprocess.run(["python3", SKILL, "--sex", "m", "--age", "47", "--height", "178", "--weight", "98", "--goal-weight", "88",
                                "--start", s.get("startDate", "2026-11-09"), "--goal-date", "2027-09-30", "--activity", "feet", "--cautious"],
                               capture_output=True, text=True).stdout)
check("settings: milestones == targets.py", s.get("milestones") == tj["milestones"], f"settings={s.get('milestones')} script={tj['milestones']}")
check("settings: startDate is a Monday", s.get("startDate") and __import__("datetime").date.fromisoformat(s["startDate"]).weekday() == 0)
pw = " ".join(s.get("privateWords", [])).lower()
check("settings: privateWords has name, city, job, condition", all(w in pw for w in ["raj", "hamburg", "nurse"]) and re.search(r"amlodipine|blood pressure|hypertension", pw), pw)
check("settings: low-salt in dailyRules", any("salt" in r.lower() for r in s.get("dailyRules", [])))
check("settings: sessions Mon/Wed/Sat", sorted(x["dayOffset"] for x in s.get("sessions", [])) == [0, 2, 5])
check("no settings.json in public repo", not any(p for p in A.rglob("settings.json") if "node_modules" not in p.parts))

# --- public side
plan = json.loads(read(A / "app" / "plan.json"))
check("plan.json: 2 styles", len(plan.get("styles", [])) == 2, [x.get("label") for x in plan.get("styles", [])])
check("plan.json: target == targets.py", plan.get("target", {}).get("kcal") == tj["targetKcal"] and plan["target"].get("protein") == tj["protein"]["use"], plan.get("target"))
M = plan.get("meals", {})
prot = [sum(M[d[k].lstrip("@")]["protein"] for k in "blsd") for st in plan.get("styles", []) for w in st["weeks"] for d in w]
check("plan.json: daily protein <= targets.py protein.max", prot and max(prot) <= tj["protein"]["max"], f"{min(prot) if prot else '-'}-{max(prot) if prot else '-'} g vs max {tj['protein']['max']}")
check("plan.json: example meals replaced", "chili" not in plan.get("meals", {}))
v = subprocess.run(["python3", VALIDATOR, str(A / "app" / "plan.json"), "--exclude", MEAT, "--private", str(sp)], capture_output=True, text=True)
check("validator --exclude meat --private: OK", v.returncode == 0, v.stdout.strip().splitlines()[-3:])
text = json.dumps(plan).lower() + read(A / "app" / "config.js").lower()
leaks = [w for w in PERSONAL if re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", text)]
check("public app has no personal words", not leaks, leaks)
check("public rules don't reveal the condition (salt/BP)", not any(re.search(r"salt|sodium|blood|\bbp\b", r, re.I) for r in plan.get("rules", [])), plan.get("rules"))
cfg = read(A / "app" / "config.js")
check("config.js: CLIENT_ID + SHEET_ID", "123456789012-abc123def456.apps.googleusercontent.com" in cfg and "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdEFG" in cfg)
check("sw.js VERSION bumped", "health-plan-v4'" not in read(A / "app" / "sw.js"))
check("tracker.xlsx built", any(A.rglob("tracker*.xlsx")) or any(P.rglob("*.xlsx")))
smoke = subprocess.run(["node", "tests/smoke.js"], cwd=A, capture_output=True, text=True, env={**os.environ, "CHROMIUM_PATH": CHROME})
check("smoke test passes", smoke.returncode == 0, smoke.stdout.strip().splitlines()[-1:] if smoke.stdout else smoke.stderr[-200:])

lg = read(R / "log.md")
check("log: stage-6 checklist (Sheets API, test users, origin, Pages)", all(re.search(x, lg, re.I) for x in ["Sheets API", "test user", "github.io", "GitHub Actions"]))
check("log: never asks for client secret", not re.search(r"(?<!n't )(?<!never )(?<!not )\b(send|give|paste) (me )?(the |your )?client secret", lg, re.I))

print(json.dumps({"run": R.name, "passed": sum(r["pass"] for r in res), "total": len(res), "results": res}, indent=1, default=str))
