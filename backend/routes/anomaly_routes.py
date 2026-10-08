"""
Anomaly detection routes with owner data isolation.
"""
import json
import os
import subprocess
from flask import Blueprint, jsonify
from db import query
from auth_utils import resolve_authorized_owner_id

anomaly_bp = Blueprint("anomaly", __name__)


def run_python(script, payload):
    python_path = os.environ.get("PYTHON_PATH", "python")
    script_path = os.path.join(os.path.dirname(__file__), "..", "python", script)
    proc = subprocess.run(
        [python_path, script_path],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Python error: {proc.stderr}")
    return json.loads(proc.stdout)


@anomaly_bp.route("/", methods=["POST"])
def detect_anomalies():
    """POST /api/anomaly — detect anomalies from transaction data for authorized owner."""
    try:
        owner_id = resolve_authorized_owner_id()
        if not owner_id:
            return jsonify({"anomalies": [], "model_used": "none"})

        transactions = query(
            "SELECT id, date, description, category, amount, type "
            "FROM transactions WHERE owner_id = %s ORDER BY date ASC",
            (owner_id,)
        )

        if not transactions:
            return jsonify({"anomalies": [], "model_used": "none"})

        # Group by month
        monthly_map = {}
        for t in transactions:
            month = str(t["date"])[:7]
            if month not in monthly_map:
                monthly_map[month] = {"income": 0, "expense": 0}
            if t["type"] == "income":
                monthly_map[month]["income"] += float(t["amount"])
            else:
                monthly_map[month]["expense"] += float(t["amount"])

        monthly_data = [
            {"month": m, "income": monthly_map[m]["income"], "expense": monthly_map[m]["expense"]}
            for m in sorted(monthly_map.keys())
        ]

        result = run_python("anomaly.py", {"monthly_data": monthly_data})
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
