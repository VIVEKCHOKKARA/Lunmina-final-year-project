"""
Transactions CRUD routes with owner data isolation.
"""
import uuid
from flask import Blueprint, request, jsonify
from db import query, execute
from realtime import emit_change
from auth_utils import (
    resolve_authorized_owner_id,
    resolve_authorized_shop_id,
    check_manager_page_permission,
    get_current_user_info,
)

transactions_bp = Blueprint("transactions", __name__)


@transactions_bp.route("/", methods=["GET"])
def list_transactions():
    """GET /api/transactions — list transactions for authorized owner & shop, newest first."""
    user = get_current_user_info()
    if user and user["role"] == "manager" and not check_manager_page_permission(user["id"], "/transactions"):
        return jsonify({"error": "Access Denied: You do not have permission to access Transactions."}), 403

    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify([])

    shop_id = resolve_authorized_shop_id()
    if user and user["role"] == "manager":
        if not shop_id:
            return jsonify([])
        rows = query(
            "SELECT id, date, description, category, amount, type, created_at "
            "FROM transactions WHERE owner_id = %s AND shop_id = %s ORDER BY date DESC",
            (owner_id, shop_id)
        )
    elif shop_id and shop_id != "all":
        rows = query(
            "SELECT id, date, description, category, amount, type, created_at "
            "FROM transactions WHERE owner_id = %s AND shop_id = %s ORDER BY date DESC",
            (owner_id, shop_id)
        )
    else:
        rows = query(
            "SELECT id, date, description, category, amount, type, created_at "
            "FROM transactions WHERE owner_id = %s ORDER BY date DESC",
            (owner_id,)
        )

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "date": str(r["date"]),
            "description": r["description"],
            "category": r["category"],
            "amount": float(r["amount"]),
            "type": r["type"],
            "created_at": str(r["created_at"]),
        })
    return jsonify(result)


@transactions_bp.route("/", methods=["POST"])
def create_transaction():
    """POST /api/transactions — create a new transaction for authorized owner/shop."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    shop_id = resolve_authorized_shop_id()
    body = request.get_json(force=True)
    tid = str(uuid.uuid4())
    execute(
        "INSERT INTO transactions (id, date, description, category, amount, type, owner_id, shop_id) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (tid, body["date"], body["description"], body["category"],
         body["amount"], body["type"], owner_id, shop_id),
    )
    emit_change("transactions", "create", {"id": tid})
    return jsonify({"id": tid}), 201


@transactions_bp.route("/<tid>", methods=["PUT"])
def update_transaction(tid):
    """PUT /api/transactions/<id> — update a transaction for authorized owner."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    body = request.get_json(force=True)
    fields, values = [], []
    for col in ("date", "description", "category", "amount", "type"):
        if col in body:
            fields.append(f"{col} = %s")
            values.append(body[col])
    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    values.append(tid)
    values.append(owner_id)
    execute(f"UPDATE transactions SET {', '.join(fields)} WHERE id = %s AND owner_id = %s", values)
    emit_change("transactions", "update", {"id": tid})
    return jsonify({"success": True})


@transactions_bp.route("/<tid>", methods=["DELETE"])
def delete_transaction(tid):
    """DELETE /api/transactions/<id>."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    execute("DELETE FROM transactions WHERE id = %s AND owner_id = %s", (tid, owner_id))
    emit_change("transactions", "delete", {"id": tid})
    return jsonify({"success": True})
