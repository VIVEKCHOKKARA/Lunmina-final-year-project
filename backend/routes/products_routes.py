"""
Products CRUD routes with owner data isolation.
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

products_bp = Blueprint("products", __name__)


@products_bp.route("/", methods=["GET"])
def list_products():
    """GET /api/products — list products for authorized owner & shop, ordered by revenue DESC."""
    user = get_current_user_info()
    if user and user["role"] == "manager" and not check_manager_page_permission(user["id"], "/products"):
        return jsonify({"error": "Access Denied: You do not have permission to access Products."}), 403

    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify([])

    shop_id = resolve_authorized_shop_id()
    if shop_id and shop_id != "all":
        rows = query(
            "SELECT id, name, category, price, units_sold, revenue, trend, cluster, created_at "
            "FROM products WHERE owner_id = %s AND (shop_id = %s OR shop_id IS NULL) ORDER BY revenue DESC",
            (owner_id, shop_id)
        )
    else:
        rows = query(
            "SELECT id, name, category, price, units_sold, revenue, trend, cluster, created_at "
            "FROM products WHERE owner_id = %s ORDER BY revenue DESC",
            (owner_id,)
        )

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "price": float(r["price"]),
            "units_sold": int(r["units_sold"]),
            "revenue": float(r["revenue"]),
            "trend": r["trend"],
            "cluster": r["cluster"],
            "created_at": str(r["created_at"]),
        })
    return jsonify(result)


@products_bp.route("/", methods=["POST"])
def create_product():
    """POST /api/products — create a new product for authorized owner/shop."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    shop_id = resolve_authorized_shop_id()
    body = request.get_json(force=True)
    pid = str(uuid.uuid4())
    price = float(body["price"])
    units_sold = int(body.get("units_sold", 0))
    revenue = body.get("revenue", price * units_sold)
    execute(
        "INSERT INTO products (id, name, category, price, units_sold, revenue, trend, cluster, owner_id, shop_id) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (pid, body["name"], body["category"], price, units_sold,
         revenue, body.get("trend", "stable"), body.get("cluster", "question-mark"), owner_id, shop_id),
    )
    emit_change("products", "create", {"id": pid})
    return jsonify({"id": pid}), 201


@products_bp.route("/<pid>", methods=["PUT"])
def update_product(pid):
    """PUT /api/products/<id> — update a product for authorized owner."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    body = request.get_json(force=True)
    fields, values = [], []
    for col in ("name", "category", "price", "units_sold", "revenue", "trend", "cluster"):
        if col in body:
            fields.append(f"{col} = %s")
            values.append(body[col])
    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    values.append(pid)
    values.append(owner_id)
    execute(f"UPDATE products SET {', '.join(fields)} WHERE id = %s AND owner_id = %s", values)
    emit_change("products", "update", {"id": pid})
    return jsonify({"success": True})


@products_bp.route("/<pid>", methods=["DELETE"])
def delete_product(pid):
    """DELETE /api/products/<id>."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    execute("DELETE FROM products WHERE id = %s AND owner_id = %s", (pid, owner_id))
    emit_change("products", "delete", {"id": pid})
    return jsonify({"success": True})
