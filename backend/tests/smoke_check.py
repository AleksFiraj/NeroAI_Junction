import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from app.db.init_db import init_db
from app.main import app


def run_smoke_check() -> None:
    init_db()
    client = TestClient(app)

    dataset_resp = client.post(
        "/generate-dataset",
        json={"num_customers": 1000, "months_history": 24, "seed": 42},
    )
    assert dataset_resp.status_code == 200, dataset_resp.text

    train_resp = client.post("/train-model")
    assert train_resp.status_code == 200, train_resp.text
    assert train_resp.json().get("trained") is True, train_resp.text

    analyze_resp = client.post("/analyze")
    assert analyze_resp.status_code == 200, analyze_resp.text

    assert client.get("/customers").status_code == 200
    assert client.get("/dashboard").status_code == 200
    assert client.get("/heatmap").status_code == 200

    customers = client.get("/customers").json()
    # Pick a flagged customer so we can assert trigger evidence is present.
    flagged = next(
        (c for c in customers if c["status"] in ("Suspicious", "Critical")), customers[0]
    )
    customer_id = flagged["customer_id"]
    assert client.get(f"/customer/{customer_id}").status_code == 200

    risk_resp = client.get(f"/risk/{customer_id}")
    assert risk_resp.status_code == 200, risk_resp.text
    risk_body = risk_resp.json()
    assert risk_body["triggers"], "expected fired triggers for a flagged customer"
    assert risk_body["groups_fired"] >= 1

    ai_resp = client.post(
        "/ai-explanation",
        json={
            "customer_id": customer_id,
            "reasons": ["Consumption dropped 72% suddenly", "Peer comparison shows 2.4x lower usage"],
            "risk_score": 86.2,
            "status": "Critical",
        },
    )
    assert ai_resp.status_code == 200, ai_resp.text

    print("Smoke check passed.")


if __name__ == "__main__":
    run_smoke_check()
