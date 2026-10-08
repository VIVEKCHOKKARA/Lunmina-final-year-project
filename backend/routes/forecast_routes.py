"""
Forecast routes with owner data isolation.
"""
import uuid
import json
import os
import subprocess
from flask import Blueprint, request, jsonify
from db import query, execute
from auth_utils import resolve_authorized_owner_id

forecast_bp = Blueprint("forecast", __name__)


def run_python_model(payload):
    """Run a Python ML script via subprocess, passing JSON on stdin."""
    python_path = os.environ.get("PYTHON_PATH", "python")
    script_path = os.path.join(os.path.dirname(__file__), "..", "python", "forecast.py")
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


@forecast_bp.route("/", methods=["POST"])
def run_forecast():
    """POST /api/forecast — build forecast from authorized owner's transactions, save to MySQL."""
    try:
        owner_id = resolve_authorized_owner_id()
        if not owner_id:
            return jsonify({"forecasts": [], "historical": {"months": [], "revenues": [], "expenses": []}})

        transactions = query(
            "SELECT id, date, description, category, amount, type "
            "FROM transactions WHERE owner_id = %s ORDER BY date ASC",
            (owner_id,)
        )

        if not transactions:
            return jsonify({"forecasts": [], "historical": {"months": [], "revenues": [], "expenses": []}})

        # Group by month
        monthly = {}
        for t in transactions:
            month = str(t["date"])[:7]  # YYYY-MM
            if month not in monthly:
                monthly[month] = {"income": 0, "expense": 0}
            if t["type"] == "income":
                monthly[month]["income"] += float(t["amount"])
            else:
                monthly[month]["expense"] += float(t["amount"])

        months = sorted(monthly.keys())
        revenues = [monthly[m]["income"] for m in months]
        expenses = [monthly[m]["expense"] for m in months]

        # Call Python ML model
        result = run_python_model({"months": months, "revenues": revenues, "expenses": expenses})

        # Save forecasts to MySQL for this owner (clear old ones first)
        execute("DELETE FROM forecasts WHERE owner_id = %s", (owner_id,))
        forecasts = result.get("forecasts", [])
        for f in forecasts:
            fid = str(uuid.uuid4())
            execute(
                "INSERT INTO forecasts (id, period, predicted_revenue, predicted_expenses, confidence, owner_id) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (fid, f["period"], f["predicted_revenue"], f["predicted_expenses"], f.get("confidence", 0), owner_id),
            )

        return jsonify({"forecasts": forecasts, "historical": {"months": months, "revenues": revenues, "expenses": expenses}})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@forecast_bp.route("/", methods=["GET"])
def get_forecasts():
    """GET /api/forecast — return saved forecasts from DB for authorized owner."""
    try:
        from auth_utils import check_manager_page_permission, get_current_user_info
        user = get_current_user_info()
        if user and user["role"] == "manager" and not check_manager_page_permission(user["id"], "/forecasting"):
            return jsonify({"error": "Access Denied: You do not have permission to access Forecasting."}), 403

        owner_id = resolve_authorized_owner_id()
        if not owner_id:
            return jsonify({"forecasts": []})

        rows = query("SELECT * FROM forecasts WHERE owner_id = %s ORDER BY period ASC", (owner_id,))
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "period": r["period"],
                "predicted_revenue": float(r["predicted_revenue"]),
                "predicted_expenses": float(r["predicted_expenses"]),
                "confidence": float(r["confidence"]),
                "created_at": str(r["created_at"]),
            })
        return jsonify({"forecasts": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
