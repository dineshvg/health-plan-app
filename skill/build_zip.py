"""Package the skill for upload: skill/health-plan-to-app.zip.

    python3 skill/build_zip.py          # rebuild the zip
    python3 skill/build_zip.py --check  # fail if the zip is out of date (run by npm test)

The zip contains SKILL.md, references/, templates/, scripts/targets.py and copies of
tests/validate_plan.py and tracker/build_tracker.py (scripts/), so the skill works before
the person's repo exists. The repo files stay the single source; never edit the copies.
"""
import sys
import zipfile
from pathlib import Path

SKILL = Path(__file__).resolve().parent
ROOT = SKILL.parent
NAME = "health-plan-to-app"
ZIP = SKILL / f"{NAME}.zip"


def files():
    out = {"SKILL.md": SKILL / "SKILL.md"}
    for sub in ("references", "templates", "scripts"):
        for f in sorted((SKILL / sub).rglob("*")):
            if f.is_file() and "__pycache__" not in f.parts:
                out[f.relative_to(SKILL).as_posix()] = f
    out["scripts/validate_plan.py"] = ROOT / "tests" / "validate_plan.py"
    out["scripts/build_tracker.py"] = ROOT / "tracker" / "build_tracker.py"
    return out


def current():
    if not ZIP.exists():
        return {}
    with zipfile.ZipFile(ZIP) as z:
        return {n[len(NAME) + 1:]: z.read(n) for n in z.namelist() if not n.endswith("/")}


want = {k: v.read_bytes() for k, v in files().items()}
if "--check" in sys.argv:
    have = current()
    if have != want:
        diff = sorted(set(have) ^ set(want) | {k for k in want if k in have and have[k] != want[k]})
        print(f"FAIL skill zip out of date ({', '.join(diff)}): run python3 skill/build_zip.py")
        sys.exit(1)
    print("OK skill zip up to date")
    sys.exit(0)

with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in sorted(want.items()):
        info = zipfile.ZipInfo(f"{NAME}/{name}", date_time=(2026, 1, 1, 0, 0, 0))  # stable bytes
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, data)
print(f"wrote {ZIP.relative_to(ROOT)} ({len(want)} files)")
