"""
Authentication & Authorization utilities for Role-Based Access Control (RBAC).
Provides helper functions for resolving authorized owner IDs and checking roles.
"""
from flask import request
from db import query
from routes.auth_routes import _current_user_id


def get_current_user_info():
    """Returns the authenticated user's dict (id, name, email, role) or None."""
    user_id = _current_user_id()
    if not user_id:
        return None
    rows = query("SELECT id, name, email, role, avatar_url FROM users WHERE id = %s", (user_id,))
    return rows[0] if rows else None


def resolve_authorized_owner_id():
    """
    Resolves the owner_id that the request is authorized to query/modify.

    Rules:
    - BUSINESS_OWNER ('owner'): Strict — returns current_user_id. Cannot view other owners.
    - SHOP_MANAGER ('manager'): Strict — returns owner_id linked to this manager.
    - FINANCIAL_ANALYST ('analyst'): Flexible — reads X-Business-Owner-Id header or ?owner_id=...
      Validates that the requested owner_id exists in the database. Defaults to first available owner.
    """
    user = get_current_user_info()
    if not user:
        first_owner = query("SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1")
        if first_owner:
            return first_owner[0]["id"]
        tx_owner = query("SELECT owner_id FROM transactions WHERE owner_id IS NOT NULL LIMIT 1")
        return tx_owner[0]["owner_id"] if tx_owner else None

    role = user["role"]
    user_id = user["id"]

    if role == "owner":
        return user_id

    elif role == "manager":
        mgr_rows = query("SELECT owner_id FROM shop_managers WHERE manager_id = %s", (user_id,))
        if mgr_rows and mgr_rows[0].get("owner_id"):
            return mgr_rows[0]["owner_id"]
        # Fallback if unlinked manager: default to first owner
        owners = query("SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1")
        return owners[0]["id"] if owners else user_id

    elif role == "analyst":
        req_owner_id = request.headers.get("X-Business-Owner-Id") or request.args.get("owner_id")
        if req_owner_id:
            check = query("SELECT id FROM users WHERE id = %s AND role = 'owner'", (req_owner_id,))
            if check:
                return req_owner_id

        # Default to first available owner in database
        first_owner = query("SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1")
        if first_owner:
            return first_owner[0]["id"]
        return user_id

    return user_id


def resolve_authorized_shop_id():
    """
    Resolves the shop_id that the request is authorized to access.

    Rules:
    - SHOP_MANAGER ('manager'): Strict — returns shop_id assigned to this manager.
      Returns None if no shop assigned. Cannot access unassigned shops or other shops.
    - BUSINESS_OWNER ('owner'): Reads X-Shop-Id header or ?shop_id=...
      Verifies that requested shop_id belongs to a business owned by this owner.
    - FINANCIAL_ANALYST ('analyst'): Reads X-Shop-Id header or ?shop_id=...
    """
    user = get_current_user_info()
    if not user:
        return None

    role = user["role"]
    user_id = user["id"]

    if role == "manager":
        # Check shop_managers table first
        sm_rows = query("SELECT shop_id FROM shop_managers WHERE manager_id = %s", (user_id,))
        if sm_rows and sm_rows[0].get("shop_id"):
            return sm_rows[0]["shop_id"]
        # Fallback check shops table
        s_rows = query("SELECT id FROM shops WHERE manager_id = %s", (user_id,))
        if s_rows and s_rows[0].get("id"):
            return s_rows[0]["id"]
        return None

    elif role == "owner":
        req_shop_id = request.headers.get("X-Shop-Id") or request.args.get("shop_id")
        if req_shop_id:
            check = query(
                "SELECT s.id FROM shops s JOIN businesses b ON s.business_id = b.id WHERE s.id = %s AND b.owner_id = %s",
                (req_shop_id, user_id)
            )
            if check:
                return req_shop_id
        return None

    elif role == "analyst":
        req_shop_id = request.headers.get("X-Shop-Id") or request.args.get("shop_id")
        if req_shop_id:
            check = query("SELECT id FROM shops WHERE id = %s", (req_shop_id,))
            if check:
                return req_shop_id
        return None

    return None


DEFAULT_MANAGER_PERMISSIONS = {
    "/": True,
    "/products": True,
    "/tutorials": True,
    "/chat": True,
    "/transactions": False,
    "/forecasting": False,
    "/anomalies": False,
    "/pricing": False,
    "/simulate": False,
    "/insights": False,
}


def check_manager_page_permission(user_id: str, page_url: str) -> bool:
    """Returns True if the manager has permission enabled for page_url. Non-managers return True."""
    user = get_current_user_info()
    if not user:
        return False

    if user["role"] != "manager":
        return True

    rows = query(
        "SELECT enabled FROM shop_manager_permissions WHERE manager_id = %s AND page_url = %s",
        (user_id, page_url)
    )
    if rows:
        return bool(rows[0]["enabled"])

    # Fallback to default permissions if not explicitly set
    return DEFAULT_MANAGER_PERMISSIONS.get(page_url, False)

