import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.dataset.generator import DatasetConfig, replace_dataset_in_db
from app.db.init_db import init_db
from app.db.session import SessionLocal


def main() -> None:
    init_db()
    with SessionLocal() as db:
        metrics = replace_dataset_in_db(db, DatasetConfig())
        print(metrics)


if __name__ == "__main__":
    main()
