"""
Business Owners, Businesses, Shops, and Shop Managers management routes.
Provides full role-based access control and multi-tenant data management.
"""
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from db import query, execute
from auth_utils import get_current_user_info, resolve_authorized_owner_id
from realtime import emit_change

business_bp = Blueprint("business", __name__)


# ── Business Owners ──────────────────────────────────────────────────────────

@business_bp.route("/business-owners", methods=["GET"])
def list_business_owners():
    """GET /api/business-owners — List all Business Owners (Analyst view)."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401
    if user["role"] != "analyst":
        # Business owners and managers only get their own single owner info
        owner_id = resolve_authorized_owner_id()
        rows = query(
            "SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at, "
            "b.id as business_id, b.name as business_name, b.industry, "
            "b.address, b.city, b.state, b.country, b.pincode, b.latitude, b.longitude "
            "FROM users u "
            "LEFT JOIN businesses b ON b.owner_id = u.id "
            "WHERE u.id = %s",
            (owner_id,)
        )
    else:
        rows = query(
            "SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at, "
            "b.id as business_id, b.name as business_name, b.industry, "
            "b.address, b.city, b.state, b.country, b.pincode, b.latitude, b.longitude "
            "FROM users u "
            "LEFT JOIN businesses b ON b.owner_id = u.id "
            "WHERE u.role = 'owner' "
            "ORDER BY u.created_at DESC"
        )

    result = []
    for r in rows:
        owner_id = r["id"]
        # Count shops & managers
        shops_count = query("SELECT COUNT(*) as cnt FROM shops s JOIN businesses b ON s.business_id = b.id WHERE b.owner_id = %s", (owner_id,))[0]["cnt"]
        mgrs_count = query("SELECT COUNT(*) as cnt FROM shop_managers WHERE owner_id = %s", (owner_id,))[0]["cnt"]

        has_loc = any([r.get("address"), r.get("city"), r.get("latitude") is not None, r.get("longitude") is not None])
        location_data = {
            "address": r.get("address") or "",
            "city": r.get("city") or "",
            "state": r.get("state") or "",
            "country": r.get("country") or "",
            "pincode": r.get("pincode") or "",
            "latitude": float(r["latitude"]) if r.get("latitude") is not None else None,
            "longitude": float(r["longitude"]) if r.get("longitude") is not None else None,
        } if has_loc else None

        result.append({
            "id": owner_id,
            "name": r["name"],
            "email": r["email"],
            "role": r["role"],
            "avatarUrl": r["avatar_url"],
            "createdAt": str(r["created_at"]),
            "businessId": r["business_id"],
            "businessName": r["business_name"] or f"{r['name']}'s Business",
            "industry": r["industry"] or "Retail & Operations",
            "shopsCount": shops_count,
            "managersCount": mgrs_count,
            "location": location_data,
        })
    return jsonify(result)


@business_bp.route("/business-owners", methods=["POST"])
def create_business_owner():
    """POST /api/business-owners — Financial Analyst creates a new Business Owner with location."""
    user = get_current_user_info()
    if not user or user["role"] != "analyst":
        return jsonify({"error": "Unauthorized. Only Financial Analysts can add Business Owners."}), 403

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    business_name = (body.get("businessName") or "").strip() or f"{name}'s Enterprise"
    industry = (body.get("industry") or "").strip() or "General Business"
    loc = body.get("location") or {}

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    # Duplicate email check
    existing = query("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        return jsonify({"error": "An account with this email already exists."}), 409

    owner_id = str(uuid.uuid4())
    hashed = generate_password_hash(password)

    # 1. Insert user with role 'owner'
    execute(
        "INSERT INTO users (id, name, email, password_hash, role) "
        "VALUES (%s, %s, %s, %s, 'owner')",
        (owner_id, name, email, hashed),
    )

    # 2. Insert business record with location fields
    business_id = str(uuid.uuid4())
    execute(
        "INSERT INTO businesses (id, owner_id, name, industry, address, city, state, country, pincode, latitude, longitude) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            business_id, owner_id, business_name, industry,
            loc.get("address"), loc.get("city"), loc.get("state"), loc.get("country"),
            loc.get("pincode"), loc.get("latitude"), loc.get("longitude")
        ),
    )

    # 3. Create default shop for this business
    shop_id = str(uuid.uuid4())
    shop_location = loc.get("city") or loc.get("address") or "Headquarters"
    execute(
        "INSERT INTO shops (id, business_id, name, location) "
        "VALUES (%s, %s, %s, %s)",
        (shop_id, business_id, f"{business_name} - Main Branch", shop_location),
    )

    emit_change("business_owners", "create", {"id": owner_id})

    return jsonify({
        "id": owner_id,
        "name": name,
        "email": email,
        "role": "owner",
        "businessId": business_id,
        "businessName": business_name,
        "industry": industry,
        "shopsCount": 1,
        "managersCount": 0,
        "location": loc if loc else None,
    }), 201


@business_bp.route("/business-owners/<owner_id>", methods=["PUT"])
def update_business_owner(owner_id):
    """PUT /api/business-owners/<id> — Financial Analyst updates Business Owner profile and location."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401
    if user["role"] != "analyst" and user["id"] != owner_id:
        return jsonify({"error": "Unauthorized. Only Financial Analysts can edit Business Owners."}), 403

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password")
    business_name = (body.get("businessName") or "").strip()
    industry = (body.get("industry") or "").strip()
    loc = body.get("location") or {}

    if not name or not email:
        return jsonify({"error": "Name and email are required."}), 400

    # Update users table
    u_fields = ["name = %s", "email = %s"]
    u_params = [name, email]
    if password and len(password) >= 6:
        u_fields.append("password_hash = %s")
        u_params.append(generate_password_hash(password))
    u_params.append(owner_id)
    execute(f"UPDATE users SET {', '.join(u_fields)} WHERE id = %s", u_params)

    # Check if business record exists
    b_rows = query("SELECT id FROM businesses WHERE owner_id = %s", (owner_id,))
    if b_rows:
        biz_id = b_rows[0]["id"]
        b_fields, b_params = [], []
        if business_name:
            b_fields.append("name = %s")
            b_params.append(business_name)
        if industry:
            b_fields.append("industry = %s")
            b_params.append(industry)

        # Location update
        b_fields.extend(["address = %s", "city = %s", "state = %s", "country = %s", "pincode = %s", "latitude = %s", "longitude = %s"])
        b_params.extend([
            loc.get("address"), loc.get("city"), loc.get("state"), loc.get("country"),
            loc.get("pincode"), loc.get("latitude"), loc.get("longitude")
        ])
        b_params.append(biz_id)
        execute(f"UPDATE businesses SET {', '.join(b_fields)} WHERE id = %s", b_params)
    else:
        biz_id = str(uuid.uuid4())
        execute(
            "INSERT INTO businesses (id, owner_id, name, industry, address, city, state, country, pincode, latitude, longitude) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                biz_id, owner_id, business_name or f"{name}'s Business", industry or "General",
                loc.get("address"), loc.get("city"), loc.get("state"), loc.get("country"),
                loc.get("pincode"), loc.get("latitude"), loc.get("longitude")
            )
        )

    emit_change("business_owners", "update", {"id": owner_id})
    return jsonify({"success": True, "id": owner_id})


@business_bp.route("/business-owners/<owner_id>", methods=["DELETE"])
def delete_business_owner(owner_id):
    """DELETE /api/business-owners/<id> — Financial Analyst deletes a Business Owner account."""
    user = get_current_user_info()
    if not user or user["role"] != "analyst":
        return jsonify({"error": "Unauthorized. Only Financial Analysts can remove Business Owners."}), 403

    execute("DELETE FROM users WHERE id = %s AND role = 'owner'", (owner_id,))
    emit_change("business_owners", "delete", {"id": owner_id})
    return jsonify({"success": True})


@business_bp.route("/business-owners/<owner_id>", methods=["GET"])
def get_business_owner_details(owner_id):
    """GET /api/business-owners/<id> — Get detailed profile and business info for an owner."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    # Security check: Business owner can only view their own profile; analyst can view any
    authorized_owner_id = resolve_authorized_owner_id()
    if user["role"] != "analyst" and owner_id != authorized_owner_id:
        return jsonify({"error": "Access denied. You can only view your own business data."}), 403

    owner_rows = query("SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = %s AND role = 'owner'", (owner_id,))
    if not owner_rows:
        return jsonify({"error": "Business Owner not found."}), 404
    o = owner_rows[0]

    b_rows = query("SELECT id, name, industry, address, city, state, country, pincode, latitude, longitude, created_at FROM businesses WHERE owner_id = %s", (owner_id,))
    biz = b_rows[0] if b_rows else {"id": None, "name": f"{o['name']}'s Business", "industry": "General"}

    # Fetch shops
    shops_rows = query(
        "SELECT s.id, s.name, s.location, s.manager_id, u.name as manager_name "
        "FROM shops s "
        "LEFT JOIN users u ON s.manager_id = u.id "
        "WHERE s.business_id = %s",
        (biz.get("id"),)
    )

    # Fetch shop managers
    mgr_rows = query(
        "SELECT sm.id, sm.manager_id, u.name, u.email, sm.phone, sm.shop_id, s.name as shop_name "
        "FROM shop_managers sm "
        "JOIN users u ON sm.manager_id = u.id "
        "LEFT JOIN shops s ON sm.shop_id = s.id "
        "WHERE sm.owner_id = %s",
        (owner_id,)
    )

    # Fetch metrics summary for this owner
    tx_summary = query(
        "SELECT "
        "COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as total_revenue, "
        "COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_expenses "
        "FROM transactions WHERE owner_id = %s",
        (owner_id,)
    )[0]

    revenue = float(tx_summary["total_revenue"])
    expenses = float(tx_summary["total_expenses"])

    return jsonify({
        "owner": {
            "id": o["id"],
            "name": o["name"],
            "email": o["email"],
            "role": o["role"],
            "avatarUrl": o["avatar_url"],
            "createdAt": str(o["created_at"]),
        },
        "business": {
            "id": biz.get("id"),
            "name": biz.get("name"),
            "industry": biz.get("industry"),
        },
        "shops": [{
            "id": s["id"],
            "name": s["name"],
            "location": s["location"],
            "managerId": s["manager_id"],
            "managerName": s["manager_name"],
        } for s in shops_rows],
        "shopManagers": [{
            "id": m["id"],
            "managerId": m["manager_id"],
            "name": m["name"],
            "email": m["email"],
            "phone": m["phone"],
            "shopId": m["shop_id"],
            "shopName": m["shop_name"],
        } for m in mgr_rows],
        "location": {
            "address": biz.get("address") or "",
            "city": biz.get("city") or "",
            "state": biz.get("state") or "",
            "country": biz.get("country") or "",
            "pincode": biz.get("pincode") or "",
            "latitude": float(biz["latitude"]) if biz.get("latitude") is not None else None,
            "longitude": float(biz["longitude"]) if biz.get("longitude") is not None else None,
        } if any([biz.get("address"), biz.get("city"), biz.get("latitude") is not None]) else None,
        "metrics": {
            "totalRevenue": revenue,
            "totalExpenses": expenses,
            "netProfit": revenue - expenses,
        }
    })


# ── Businesses ─────────────────────────────────────────────────────────────

@business_bp.route("/businesses", methods=["GET"])
def list_businesses():
    """GET /api/businesses — List businesses owned by authorized owner."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    owner_id = resolve_authorized_owner_id()
    rows = query(
        "SELECT id, owner_id, name, industry, address, city, state, country, pincode, latitude, longitude, created_at "
        "FROM businesses WHERE owner_id = %s ORDER BY created_at DESC",
        (owner_id,)
    )

    res = []
    for r in rows:
        has_loc = any([r.get("address"), r.get("city"), r.get("latitude") is not None])
        res.append({
            "id": r["id"],
            "ownerId": r["owner_id"],
            "name": r["name"],
            "industry": r["industry"] or "General",
            "location": {
                "address": r.get("address") or "",
                "city": r.get("city") or "",
                "state": r.get("state") or "",
                "country": r.get("country") or "",
                "pincode": r.get("pincode") or "",
                "latitude": float(r["latitude"]) if r.get("latitude") is not None else None,
                "longitude": float(r["longitude"]) if r.get("longitude") is not None else None,
            } if has_loc else None,
            "createdAt": str(r["created_at"]),
        })
    return jsonify(res)


@business_bp.route("/businesses", methods=["POST"])
def create_business():
    """POST /api/businesses — Business Owner creates a new Business."""
    user = get_current_user_info()
    if not user or user["role"] not in ("owner", "analyst"):
        return jsonify({"error": "Unauthorized. Only Business Owners or Analysts can create businesses."}), 403

    owner_id = resolve_authorized_owner_id()
    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    industry = (body.get("industry") or "").strip() or "General Business"
    loc = body.get("location") or {}

    if not name:
        return jsonify({"error": "Business name is required."}), 400

    biz_id = str(uuid.uuid4())
    execute(
        "INSERT INTO businesses (id, owner_id, name, industry, address, city, state, country, pincode, latitude, longitude) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            biz_id, owner_id, name, industry,
            loc.get("address"), loc.get("city"), loc.get("state"), loc.get("country"),
            loc.get("pincode"), loc.get("latitude"), loc.get("longitude")
        )
    )
    emit_change("businesses", "create", {"id": biz_id})
    return jsonify({"id": biz_id, "name": name, "industry": industry}), 201


@business_bp.route("/businesses/<business_id>", methods=["PUT"])
def update_business(business_id):
    """PUT /api/businesses/<id> — Edit Business details & location. Enforces ownership."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    b_rows = query("SELECT owner_id FROM businesses WHERE id = %s", (business_id,))
    if not b_rows:
        return jsonify({"error": "Business not found."}), 404

    # Security check: owner can ONLY modify their OWN business
    if user["role"] != "analyst" and b_rows[0]["owner_id"] != user["id"]:
        return jsonify({"error": "Unauthorized. You can only edit businesses belonging to your account."}), 403

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    industry = (body.get("industry") or "").strip()
    loc = body.get("location") or {}

    fields, params = [], []
    if name:
        fields.append("name = %s")
        params.append(name)
    if industry:
        fields.append("industry = %s")
        params.append(industry)

    if loc:
        fields.extend(["address = %s", "city = %s", "state = %s", "country = %s", "pincode = %s", "latitude = %s", "longitude = %s"])
        params.extend([
            loc.get("address"), loc.get("city"), loc.get("state"), loc.get("country"),
            loc.get("pincode"), loc.get("latitude"), loc.get("longitude")
        ])

    if fields:
        params.append(business_id)
        execute(f"UPDATE businesses SET {', '.join(fields)} WHERE id = %s", params)

    emit_change("businesses", "update", {"id": business_id})
    return jsonify({"success": True, "id": business_id})


@business_bp.route("/businesses/<business_id>", methods=["DELETE"])
def delete_business(business_id):
    """DELETE /api/businesses/<id> — Delete a Business. Enforces ownership."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    b_rows = query("SELECT owner_id FROM businesses WHERE id = %s", (business_id,))
    if not b_rows:
        return jsonify({"error": "Business not found."}), 404

    # Security check: owner can ONLY delete their OWN business
    if user["role"] != "analyst" and b_rows[0]["owner_id"] != user["id"]:
        return jsonify({"error": "Unauthorized. You can only delete businesses belonging to your account."}), 403

    execute("DELETE FROM businesses WHERE id = %s", (business_id,))
    emit_change("businesses", "delete", {"id": business_id})
    return jsonify({"success": True})

@business_bp.route("/shop-managers", methods=["GET"])
def list_shop_managers():
    """GET /api/shop-managers — List shop managers for the authorized owner."""
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    rows = query(
        "SELECT sm.id, sm.manager_id, u.name, u.email, sm.phone, sm.shop_id, s.name as shop_name, sm.created_at "
        "FROM shop_managers sm "
        "JOIN users u ON sm.manager_id = u.id "
        "LEFT JOIN shops s ON sm.shop_id = s.id "
        "WHERE sm.owner_id = %s "
        "ORDER BY sm.created_at DESC",
        (owner_id,)
    )

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "managerId": r["manager_id"],
            "name": r["name"],
            "email": r["email"],
            "phone": r["phone"] or "",
            "shopId": r["shop_id"],
            "shopName": r["shop_name"] or "General Operations",
            "createdAt": str(r["created_at"]),
        })
    return jsonify(result)


@business_bp.route("/shop-managers", methods=["POST"])
def create_shop_manager():
    """POST /api/shop-managers — Business Owner creates a new Shop Manager."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    phone = (body.get("phone") or "").strip()
    shop_id = body.get("shopId")

    # Target owner_id: defaults to logged in owner or body param if analyst
    target_owner_id = resolve_authorized_owner_id()
    if user["role"] == "analyst" and body.get("ownerId"):
        target_owner_id = body.get("ownerId")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    # Duplicate email check
    existing = query("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        return jsonify({"error": "An account with this email already exists."}), 409

    manager_id = str(uuid.uuid4())
    hashed = generate_password_hash(password)

    # 1. Create User (role = 'manager')
    execute(
        "INSERT INTO users (id, name, email, password_hash, role) "
        "VALUES (%s, %s, %s, %s, 'manager')",
        (manager_id, name, email, hashed),
    )

    # 2. Insert into shop_managers
    sm_id = str(uuid.uuid4())
    execute(
        "INSERT INTO shop_managers (id, manager_id, owner_id, shop_id, phone) "
        "VALUES (%s, %s, %s, %s, %s)",
        (sm_id, manager_id, target_owner_id, shop_id, phone),
    )

    # 3. If shop_id was passed, update shops table
    if shop_id:
        execute("UPDATE shops SET manager_id = %s WHERE id = %s", (manager_id, shop_id))

    # 4. Seed default permissions for this Shop Manager
    from auth_utils import DEFAULT_MANAGER_PERMISSIONS
    for page_url, enabled in DEFAULT_MANAGER_PERMISSIONS.items():
        execute(
            "INSERT INTO shop_manager_permissions (id, manager_id, page_url, enabled) "
            "VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
            (str(uuid.uuid4()), manager_id, page_url, 1 if enabled else 0),
        )

    emit_change("shop_managers", "create", {"id": sm_id})

    return jsonify({
        "id": sm_id,
        "managerId": manager_id,
        "name": name,
        "email": email,
        "phone": phone,
        "shopId": shop_id,
        "ownerId": target_owner_id,
    }), 201


# ── Shops ───────────────────────────────────────────────────────────────────

# ── Shops ───────────────────────────────────────────────────────────────────

@business_bp.route("/shops", methods=["GET"])
def list_shops():
    """GET /api/shops — List shops for the authorized owner or assigned manager."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    if user["role"] == "manager":
        # Shop Managers see ONLY shops assigned to them
        rows = query(
            "SELECT s.id, s.business_id, s.name, s.location, s.address, s.city, s.state, s.country, s.pincode, "
            "s.latitude, s.longitude, s.status, s.manager_id, u.name as manager_name, s.created_at "
            "FROM shops s "
            "LEFT JOIN users u ON s.manager_id = u.id "
            "WHERE s.manager_id = %s "
            "ORDER BY s.created_at ASC",
            (user["id"],)
        )
    else:
        owner_id = resolve_authorized_owner_id()
        if not owner_id:
            return jsonify({"error": "Not authenticated."}), 401

        rows = query(
            "SELECT s.id, s.business_id, s.name, s.location, s.address, s.city, s.state, s.country, s.pincode, "
            "s.latitude, s.longitude, s.status, s.manager_id, u.name as manager_name, s.created_at "
            "FROM shops s "
            "JOIN businesses b ON s.business_id = b.id "
            "LEFT JOIN users u ON s.manager_id = u.id "
            "WHERE b.owner_id = %s "
            "ORDER BY s.created_at ASC",
            (owner_id,)
        )

        if not rows:
            b_rows = query("SELECT id, name, city, address FROM businesses WHERE owner_id = %s", (owner_id,))
            if b_rows:
                biz = b_rows[0]
                shop_id = str(uuid.uuid4())
                shop_name = f"{biz['name']} - Main Branch"
                shop_location = biz.get("city") or biz.get("address") or "Headquarters"
                execute(
                    "INSERT INTO shops (id, business_id, name, location, address, city, state, country, pincode, status) "
                    "VALUES (%s, %s, %s, %s, %s, %s, 'State', 'India', '500001', 'Active')",
                    (shop_id, biz["id"], shop_name, shop_location, biz.get("address") or shop_location, biz.get("city") or "Hyderabad")
                )
                rows = query(
                    "SELECT s.id, s.business_id, s.name, s.location, s.address, s.city, s.state, s.country, s.pincode, "
                    "s.latitude, s.longitude, s.status, s.manager_id, u.name as manager_name, s.created_at "
                    "FROM shops s "
                    "JOIN businesses b ON s.business_id = b.id "
                    "LEFT JOIN users u ON s.manager_id = u.id "
                    "WHERE b.owner_id = %s "
                    "ORDER BY s.created_at ASC",
                    (owner_id,)
                )

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "businessId": r["business_id"],
            "name": r["name"],
            "location": r["location"] or r["address"] or "",
            "address": r.get("address") or "",
            "city": r.get("city") or "",
            "state": r.get("state") or "",
            "country": r.get("country") or "",
            "pincode": r.get("pincode") or "",
            "latitude": float(r["latitude"]) if r.get("latitude") is not None else None,
            "longitude": float(r["longitude"]) if r.get("longitude") is not None else None,
            "status": r.get("status") or "Active",
            "managerId": r["manager_id"],
            "managerName": r["manager_name"],
            "createdAt": str(r["created_at"]),
        })
    return jsonify(result)


@business_bp.route("/shops", methods=["POST"])
def create_shop():
    """POST /api/shops — Add a new shop for the business owner."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401
    if user["role"] == "manager":
        return jsonify({"error": "Unauthorized. Shop Managers cannot add shops."}), 403

    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    b_rows = query("SELECT id FROM businesses WHERE owner_id = %s", (owner_id,))
    if not b_rows:
        # Create business record if missing
        biz_id = str(uuid.uuid4())
        user_row = query("SELECT name FROM users WHERE id = %s", (owner_id,))
        owner_name = user_row[0]["name"] if user_row else "Owner"
        execute(
            "INSERT INTO businesses (id, owner_id, name, industry) VALUES (%s, %s, %s, %s)",
            (biz_id, owner_id, f"{owner_name}'s Business", "Retail")
        )
        business_id = biz_id
    else:
        business_id = b_rows[0]["id"]

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    location = (body.get("location") or body.get("address") or "").strip()
    address = (body.get("address") or location).strip()
    city = (body.get("city") or "").strip()
    state = (body.get("state") or "").strip()
    country = (body.get("country") or "").strip()
    pincode = (body.get("pincode") or "").strip()
    lat = body.get("latitude")
    lng = body.get("longitude")
    status = body.get("status") or "Active"
    manager_id = body.get("managerId")

    if not name:
        return jsonify({"error": "Shop name is required."}), 400

    shop_id = str(uuid.uuid4())
    execute(
        "INSERT INTO shops (id, business_id, name, location, address, city, state, country, pincode, latitude, longitude, status, manager_id) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (shop_id, business_id, name, location, address, city, state, country, pincode, lat, lng, status, manager_id),
    )

    if manager_id:
        execute("UPDATE shop_managers SET shop_id = %s WHERE manager_id = %s", (shop_id, manager_id))

    emit_change("shops", "create", {"id": shop_id})
    return jsonify({
        "id": shop_id,
        "businessId": business_id,
        "name": name,
        "location": location,
        "address": address,
        "city": city,
        "state": state,
        "country": country,
        "pincode": pincode,
        "latitude": lat,
        "longitude": lng,
        "status": status,
        "managerId": manager_id,
    }), 201


@business_bp.route("/shops/<shop_id>", methods=["PUT"])
def update_shop(shop_id):
    """PUT /api/shops/<id> — Update shop details. Verifies ownership."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401
    if user["role"] == "manager":
        return jsonify({"error": "Unauthorized. Shop Managers cannot edit shops."}), 403

    s_rows = query("SELECT s.id, b.owner_id, s.manager_id FROM shops s JOIN businesses b ON s.business_id = b.id WHERE s.id = %s", (shop_id,))
    if not s_rows:
        return jsonify({"error": "Shop not found."}), 404

    shop_owner_id = s_rows[0]["owner_id"]
    old_manager_id = s_rows[0]["manager_id"]

    if user["role"] != "analyst" and shop_owner_id != user["id"]:
        return jsonify({"error": "Unauthorized. You can only edit shops belonging to your account."}), 403

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    location = (body.get("location") or body.get("address") or "").strip()
    address = (body.get("address") or location).strip()
    city = (body.get("city") or "").strip()
    state = (body.get("state") or "").strip()
    country = (body.get("country") or "").strip()
    pincode = (body.get("pincode") or "").strip()
    lat = body.get("latitude")
    lng = body.get("longitude")
    status = body.get("status") or "Active"
    manager_id = body.get("managerId") if "managerId" in body else old_manager_id

    if not name:
        return jsonify({"error": "Shop name is required."}), 400

    execute(
        "UPDATE shops SET name = %s, location = %s, address = %s, city = %s, state = %s, country = %s, "
        "pincode = %s, latitude = %s, longitude = %s, status = %s, manager_id = %s WHERE id = %s",
        (name, location, address, city, state, country, pincode, lat, lng, status, manager_id, shop_id)
    )

    # Sync manager assignment in shop_managers table
    if manager_id != old_manager_id:
        if old_manager_id:
            execute("UPDATE shop_managers SET shop_id = NULL WHERE manager_id = %s AND shop_id = %s", (old_manager_id, shop_id))
        if manager_id:
            execute("UPDATE shop_managers SET shop_id = %s WHERE manager_id = %s", (shop_id, manager_id))

    emit_change("shops", "update", {"id": shop_id})
    return jsonify({"success": True, "id": shop_id})


@business_bp.route("/shops/<shop_id>", methods=["DELETE"])
def delete_shop(shop_id):
    """DELETE /api/shops/<id> — Delete a shop. Verifies ownership."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401
    if user["role"] == "manager":
        return jsonify({"error": "Unauthorized. Shop Managers cannot delete shops."}), 403

    s_rows = query("SELECT s.id, b.owner_id, s.manager_id FROM shops s JOIN businesses b ON s.business_id = b.id WHERE s.id = %s", (shop_id,))
    if not s_rows:
        return jsonify({"error": "Shop not found."}), 404

    shop_owner_id = s_rows[0]["owner_id"]
    if user["role"] != "analyst" and shop_owner_id != user["id"]:
        return jsonify({"error": "Unauthorized. You can only delete shops belonging to your account."}), 403

    # Unassign manager if assigned
    execute("UPDATE shop_managers SET shop_id = NULL WHERE shop_id = %s", (shop_id,))
    execute("DELETE FROM shops WHERE id = %s", (shop_id,))

    emit_change("shops", "delete", {"id": shop_id})
    return jsonify({"success": True})


@business_bp.route("/shops/<shop_id>/performance", methods=["GET"])
@business_bp.route("/business-owner/shops/<shop_id>/performance", methods=["GET"])
def get_shop_performance(shop_id):
    """GET /api/shops/<shop_id>/performance — Fetch performance metrics & charts for a specific shop. Enforces ownership isolation."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        return jsonify({"error": "Not authenticated."}), 401

    if shop_id == "all":
        if user["role"] == "manager":
            return jsonify({"error": "Access denied. Shop managers can only view performance for their assigned shop."}), 403
        s_rows = query(
            "SELECT s.id, s.name, s.location, s.address, s.city, s.status, s.manager_id, u.name as manager_name "
            "FROM shops s JOIN businesses b ON s.business_id = b.id "
            "LEFT JOIN users u ON s.manager_id = u.id "
            "WHERE b.owner_id = %s",
            (owner_id,)
        )
        shop = {
            "id": "all",
            "name": "All Shops Combined",
            "location": f"Total {len(s_rows)} Store Locations",
            "city": "All Branches",
            "status": "Active Portfolio",
            "manager_name": f"{len(s_rows)} Managers",
        }
        tx_rows = query(
            "SELECT id, date, description, category, amount, type, created_at "
            "FROM transactions WHERE owner_id = %s ORDER BY date ASC",
            (owner_id,)
        )
        import hashlib
        hash_val = int(hashlib.md5(b"all").hexdigest(), 16)
        eval_tx = tx_rows
        var_factor = 1.0
        tagged_shop_tx = True
    else:
        # Security & Data Isolation Check: Verify shop exists and belongs to this authorized owner (or manager assigned)
        if user["role"] == "manager":
            s_rows = query(
                "SELECT s.id, s.name, s.location, s.address, s.city, s.status, s.manager_id, u.name as manager_name "
                "FROM shops s LEFT JOIN users u ON s.manager_id = u.id "
                "WHERE s.id = %s AND s.manager_id = %s",
                (shop_id, user["id"])
            )
        elif user["role"] == "analyst":
            s_rows = query(
                "SELECT s.id, s.name, s.location, s.address, s.city, s.status, s.manager_id, u.name as manager_name "
                "FROM shops s LEFT JOIN users u ON s.manager_id = u.id "
                "WHERE s.id = %s",
                (shop_id,)
            )
        else:
            s_rows = query(
                "SELECT s.id, s.name, s.location, s.address, s.city, s.status, s.manager_id, u.name as manager_name "
                "FROM shops s "
                "JOIN businesses b ON s.business_id = b.id "
                "LEFT JOIN users u ON s.manager_id = u.id "
                "WHERE s.id = %s AND b.owner_id = %s",
                (shop_id, owner_id)
            )

        if not s_rows:
            return jsonify({"error": "Access denied. Shop not found or not authorized for your account."}), 403

        shop = s_rows[0]

        # Fetch transactions strictly for this specific shop
        tx_rows = query(
            "SELECT id, date, description, category, amount, type, created_at "
            "FROM transactions WHERE shop_id = %s AND owner_id = %s ORDER BY date ASC",
            (shop_id, owner_id)
        )

    income_tx = [t for t in tx_rows if t["type"] == "income"]
    expense_tx = [t for t in tx_rows if t["type"] == "expense"]

    total_revenue = round(sum(float(t["amount"]) for t in income_tx), 2)
    total_expenses = round(sum(float(t["amount"]) for t in expense_tx), 2)
    net_profit = round(total_revenue - total_expenses, 2)

    total_orders = len(income_tx)
    completed_orders = total_orders
    pending_orders = 0
    total_customers = len(set(t.get("description") or t["id"] for t in income_tx)) if income_tx else 0
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0
    sales_growth = 0.0

    # Monthly Trend (AreaChart data)
    monthly_map = {}
    for t in tx_rows:
        m_label = str(t["date"])[:7]
        if m_label not in monthly_map:
            monthly_map[m_label] = {"month": m_label, "revenue": 0.0, "expenses": 0.0, "profit": 0.0}
        amt = float(t["amount"])
        if t["type"] == "income":
            monthly_map[m_label]["revenue"] += amt
        else:
            monthly_map[m_label]["expenses"] += amt
        monthly_map[m_label]["profit"] = monthly_map[m_label]["revenue"] - monthly_map[m_label]["expenses"]

    revenue_trend = sorted(list(monthly_map.values()), key=lambda x: x["month"])[-6:]
    for m in revenue_trend:
        m["revenue"] = round(m["revenue"], 2)
        m["expenses"] = round(m["expenses"], 2)
        m["profit"] = round(m["profit"], 2)

    # Category Breakdown (PieChart data)
    prod_rows = query("SELECT category, SUM(revenue) as tot_rev FROM products WHERE owner_id = %s GROUP BY category", (owner_id,))
    category_breakdown = []
    tot_prod_rev = sum(float(r["tot_rev"] or 0) for r in prod_rows) or 1.0
    for r in prod_rows:
        c_val = round(float(r["tot_rev"] or 0), 2)
        pct = round((c_val / tot_prod_rev) * 100, 1)
        category_breakdown.append({
            "name": r["category"],
            "value": c_val,
            "percentage": pct
        })

    # Recent Transactions list
    recent_tx = []
    for t in tx_rows[:6]:
        recent_tx.append({
            "id": t["id"],
            "date": str(t["date"]),
            "description": t["description"],
            "category": t["category"],
            "amount": round(float(t["amount"]), 2),
            "type": t["type"],
        })

    return jsonify({
        "shop": {
            "id": shop["id"],
            "name": shop["name"],
            "location": shop["location"] or shop.get("address") or "Branch Location",
            "city": shop.get("city") or "",
            "status": shop.get("status") or "Active",
            "managerName": shop.get("manager_name") or "Not Assigned",
        },
        "performance": {
            "totalSales": total_revenue,
            "totalRevenue": total_revenue,
            "totalExpenses": total_expenses,
            "netProfit": net_profit,
            "totalOrders": total_orders,
            "completedOrders": completed_orders,
            "pendingOrders": pending_orders,
            "totalCustomers": total_customers,
            "avgOrderValue": avg_order_value,
            "salesGrowth": sales_growth,
            "revenueTrend": revenue_trend,
            "categoryBreakdown": category_breakdown,
            "recentTransactions": recent_tx
        }
    })


# ── Shop Manager Permissions & Profile Management ───────────────────────────

@business_bp.route("/shop-managers/<manager_id>/permissions", methods=["GET"])
def get_shop_manager_permissions(manager_id):
    """GET /api/shop-managers/<id>/permissions — Fetch page permissions for a manager."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    from auth_utils import DEFAULT_MANAGER_PERMISSIONS

    rows = query("SELECT page_url, enabled FROM shop_manager_permissions WHERE manager_id = %s", (manager_id,))
    perm_map = dict(DEFAULT_MANAGER_PERMISSIONS)

    for r in rows:
        perm_map[r["page_url"]] = bool(r["enabled"])

    return jsonify({"managerId": manager_id, "permissions": perm_map})


@business_bp.route("/shop-managers/<manager_id>/permissions", methods=["PUT"])
def update_shop_manager_permissions(manager_id):
    """PUT /api/shop-managers/<id>/permissions — Save updated permissions for a manager."""
    user = get_current_user_info()
    if not user or user["role"] not in ("owner", "analyst"):
        return jsonify({"error": "Unauthorized to manage permissions."}), 403

    body = request.get_json(force=True) or {}
    permissions = body.get("permissions") or {}

    for page_url, enabled in permissions.items():
        execute(
            "INSERT INTO shop_manager_permissions (id, manager_id, page_url, enabled) "
            "VALUES (%s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
            (str(uuid.uuid4()), manager_id, page_url, 1 if enabled else 0),
        )

    emit_change("permissions", "update", {"manager_id": manager_id})
    return jsonify({"success": True, "managerId": manager_id})


@business_bp.route("/shop-managers/<manager_id>/permissions/reset", methods=["POST"])
def reset_shop_manager_permissions(manager_id):
    """POST /api/shop-managers/<id>/permissions/reset — Restore default manager permissions."""
    user = get_current_user_info()
    if not user or user["role"] not in ("owner", "analyst"):
        return jsonify({"error": "Unauthorized."}), 403

    from auth_utils import DEFAULT_MANAGER_PERMISSIONS
    execute("DELETE FROM shop_manager_permissions WHERE manager_id = %s", (manager_id,))

    for page_url, enabled in DEFAULT_MANAGER_PERMISSIONS.items():
        execute(
            "INSERT INTO shop_manager_permissions (id, manager_id, page_url, enabled) "
            "VALUES (%s, %s, %s, %s)",
            (str(uuid.uuid4()), manager_id, page_url, 1 if enabled else 0),
        )

    emit_change("permissions", "reset", {"manager_id": manager_id})
    return jsonify({"success": True, "managerId": manager_id, "permissions": DEFAULT_MANAGER_PERMISSIONS})


@business_bp.route("/shop-managers/<manager_id>", methods=["PUT"])
def update_shop_manager_profile(manager_id):
    """PUT /api/shop-managers/<id> — Edit Shop Manager profile details."""
    user = get_current_user_info()
    if not user or user["role"] not in ("owner", "analyst"):
        return jsonify({"error": "Unauthorized."}), 403

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    phone = (body.get("phone") or "").strip()
    shop_id = body.get("shopId")
    password = body.get("password")

    if not name or not email:
        return jsonify({"error": "Name and email are required."}), 400

    # Update users table
    u_fields, u_params = ["name = %s", "email = %s"], [name, email]
    if password and len(password) >= 6:
        u_fields.append("password_hash = %s")
        u_params.append(generate_password_hash(password))

    u_params.append(manager_id)
    execute(f"UPDATE users SET {', '.join(u_fields)} WHERE id = %s", u_params)

    # Update shop_managers table
    execute("UPDATE shop_managers SET phone = %s, shop_id = %s WHERE manager_id = %s", (phone, shop_id, manager_id))

    # Update shops table if shop_id set
    if shop_id:
        execute("UPDATE shops SET manager_id = %s WHERE id = %s", (manager_id, shop_id))

    emit_change("shop_managers", "update", {"id": manager_id})
    return jsonify({"success": True})


@business_bp.route("/shop-managers/<manager_id>", methods=["DELETE"])
def delete_shop_manager(manager_id):
    """DELETE /api/shop-managers/<id> — Remove / deactivate a Shop Manager."""
    user = get_current_user_info()
    if not user or user["role"] not in ("owner", "analyst"):
        return jsonify({"error": "Unauthorized."}), 403

    # Delete user (CASCADE deletes shop_managers and shop_manager_permissions)
    execute("DELETE FROM users WHERE id = %s AND role = 'manager'", (manager_id,))
    execute("UPDATE shops SET manager_id = NULL WHERE manager_id = %s", (manager_id,))

    emit_change("shop_managers", "delete", {"id": manager_id})
    return jsonify({"success": True})


@business_bp.route("/my-permissions", methods=["GET"])
def get_my_permissions():
    """GET /api/my-permissions — Fetch allowed permissions for logged in manager."""
    user = get_current_user_info()
    if not user:
        return jsonify({"error": "Not authenticated."}), 401

    if user["role"] != "manager":
        # Owner & Analyst have full permissions on all pages
        from auth_utils import DEFAULT_MANAGER_PERMISSIONS
        all_perms = {k: True for k in DEFAULT_MANAGER_PERMISSIONS.keys()}
        return jsonify({"permissions": all_perms})

    from auth_utils import DEFAULT_MANAGER_PERMISSIONS
    rows = query("SELECT page_url, enabled FROM shop_manager_permissions WHERE manager_id = %s", (user["id"],))
    perm_map = dict(DEFAULT_MANAGER_PERMISSIONS)

    for r in rows:
        perm_map[r["page_url"]] = bool(r["enabled"])

    return jsonify({"permissions": perm_map})

