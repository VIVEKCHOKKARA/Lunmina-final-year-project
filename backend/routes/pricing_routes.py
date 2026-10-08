"""
Pricing routes with owner data isolation — AI pricing suggestions (XGBoost) + Analyst approval workflow.
"""
import json
import os
import uuid
import subprocess
from flask import Blueprint, request, jsonify
from db import query, execute
from realtime import emit_change
from auth_utils import resolve_authorized_owner_id

pricing_bp = Blueprint("pricing", __name__)


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


def _serialize(row):
    return {
        "id": row["id"],
        "productId": row["product_id"],
        "product": row["product_name"],
        "currentPrice": float(row["current_price"]),
        "suggestedPrice": float(row["suggested_price"]),
        "reason": row["reason"],
        "confidence": int(row["confidence"]),
        "expectedImpact": row["expected_impact"],
        "modelUsed": row["model_used"],
        "status": row["status"],
        "createdAt": str(row["created_at"]),
        "reviewedAt": str(row["reviewed_at"]) if row["reviewed_at"] else None,
    }


@pricing_bp.route("/generate", methods=["POST"])
def generate_pricing():
    """POST /api/pricing/generate — run XGBoost and store fresh pending recommendations for authorized owner."""
    try:
        owner_id = resolve_authorized_owner_id()
        if not owner_id:
            return jsonify({"suggestions": [], "model_used": "none"})

        rows = query(
            "SELECT id, name, price, units_sold, revenue, trend, cluster FROM products WHERE owner_id = %s",
            (owner_id,)
        )
        if not rows:
            return jsonify({"suggestions": [], "model_used": "none"})

        products = [{
            "id": r["id"],
            "name": r["name"],
            "price": float(r["price"]),
            "units_sold": int(r["units_sold"]),
            "revenue": float(r["revenue"]),
            "trend": r["trend"],
            "cluster": r["cluster"],
        } for r in rows]

        result = run_python("pricing.py", {"products": products})
        suggestions = result.get("suggestions", [])
        model_used = result.get("model_used", "rule_based")

        # Replace any stale pending recommendations for this owner.
        execute("DELETE FROM pricing_recommendations WHERE status = 'pending' AND owner_id = %s", (owner_id,))
        for s in suggestions:
            execute(
                "INSERT INTO pricing_recommendations "
                "(id, product_id, product_name, current_price, suggested_price, "
                " reason, confidence, expected_impact, model_used, status, owner_id) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s)",
                (str(uuid.uuid4()), s["productId"], s["product"], s["currentPrice"],
                 s["suggestedPrice"], s.get("reason"), s.get("confidence", 0),
                 s.get("expectedImpact"), model_used, owner_id),
            )

        emit_change("pricing", "generate", {"count": len(suggestions)})

        stored = query(
            "SELECT * FROM pricing_recommendations WHERE status = 'pending' AND owner_id = %s "
            "ORDER BY created_at DESC",
            (owner_id,)
        )
        return jsonify({
            "suggestions": [_serialize(r) for r in stored],
            "model_used": model_used,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@pricing_bp.route("/", methods=["GET"])
def list_pricing():
    """GET /api/pricing[?status=pending] — list stored recommendations for authorized owner."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify([])

    status = request.args.get("status")
    if status:
        rows = query(
            "SELECT * FROM pricing_recommendations WHERE status = %s AND owner_id = %s ORDER BY created_at DESC",
            (status, owner_id),
        )
    else:
        rows = query("SELECT * FROM pricing_recommendations WHERE owner_id = %s ORDER BY created_at DESC", (owner_id,))
    return jsonify([_serialize(r) for r in rows])


@pricing_bp.route("/", methods=["POST"])
def get_pricing():
    """POST /api/pricing — alias for /generate."""
    return generate_pricing()


@pricing_bp.route("/<rec_id>/approve", methods=["POST"])
def approve_pricing(rec_id):
    """POST /api/pricing/<id>/approve — apply the suggested price and mark approved."""
    owner_id = resolve_authorized_owner_id()
    rows = query("SELECT * FROM pricing_recommendations WHERE id = %s AND owner_id = %s", (rec_id, owner_id))
    if not rows:
        return jsonify({"error": "Recommendation not found"}), 404
    rec = rows[0]

    # Apply the suggested price to the product, recomputing revenue.
    execute(
        "UPDATE products SET price = %s, revenue = %s * units_sold WHERE id = %s AND owner_id = %s",
        (rec["suggested_price"], rec["suggested_price"], rec["product_id"], owner_id),
    )
    execute(
        "UPDATE pricing_recommendations SET status = 'approved', "
        "reviewed_at = CURRENT_TIMESTAMP WHERE id = %s AND owner_id = %s",
        (rec_id, owner_id),
    )

    emit_change("pricing", "approve", {"id": rec_id})
    emit_change("products", "update", {"id": rec["product_id"]})
    return jsonify({"success": True, "status": "approved"})


@pricing_bp.route("/<rec_id>/reject", methods=["POST"])
def reject_pricing(rec_id):
    """POST /api/pricing/<id>/reject — mark recommendation rejected (no price change)."""
    owner_id = resolve_authorized_owner_id()
    affected = query("SELECT id FROM pricing_recommendations WHERE id = %s AND owner_id = %s", (rec_id, owner_id))
    if not affected:
        return jsonify({"error": "Recommendation not found"}), 404

    execute(
        "UPDATE pricing_recommendations SET status = 'rejected', "
        "reviewed_at = CURRENT_TIMESTAMP WHERE id = %s AND owner_id = %s",
        (rec_id, owner_id),
    )
    emit_change("pricing", "reject", {"id": rec_id})
    return jsonify({"success": True, "status": "rejected"})
