import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.services.pipeline import run_full_analysis


def main() -> None:
    init_db()
    with SessionLocal() as db:
        result = run_full_analysis(db)
        print(result)


if __name__ == "__main__":
    main()
