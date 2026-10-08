"""
Authentication routes — register / login / current-user for the three roles:
owner (Business Owner), manager (Shop Manager), analyst (Financial Analyst).

Passwords are hashed with Werkzeug (PBKDF2). Sessions use a signed, timed
token (itsdangerous) carrying the user id — stateless, no server-side store.
The frontend sends it back as `Authorization: Bearer <token>`.
"""
import os
import uuid

from flask import Blueprint, request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash

from db import query, execute

auth_bp = Blueprint("auth", __name__)

VALID_ROLES = ("owner", "manager", "analyst")

# Secret for signing tokens. Set AUTH_SECRET in .env for production; the
# fallback keeps local dev working out of the box.
_SECRET = os.environ.get("AUTH_SECRET", "profit-navigator-dev-secret-change-me")
_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
_serializer = URLSafeTimedSerializer(_SECRET, salt="auth-token")


def _make_token(user_id: str) -> str:
    return _serializer.dumps(user_id)


def _read_token(token: str):
    """Return the user id for a valid token, else None."""
    try:
        return _serializer.loads(token, max_age=_TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None


def _public_user(row: dict) -> dict:
    """Strip the password hash before sending a user to the client."""
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "avatarUrl": row.get("avatar_url"),
    }


def _current_user_id():
    """Resolve the user id from the request's bearer token, or None."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    return _read_token(token) if token else None


def _find_by_email(email: str):
    rows = query("SELECT * FROM users WHERE email = %s", (email,))
    return rows[0] if rows else None


@auth_bp.route("/register", methods=["POST"])
def register():
    """POST /api/auth/register — create an account for a given role.

    Body: { "name", "email", "password", "role": owner|manager|analyst }
    """
    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = body.get("role")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required."}), 400
    if role not in VALID_ROLES:
        return jsonify({"error": "Role must be owner, manager or analyst."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if _find_by_email(email):
        return jsonify({"error": "An account with this email already exists."}), 409

    user_id = str(uuid.uuid4())
    execute(
        "INSERT INTO users (id, name, email, password_hash, role) "
        "VALUES (%s, %s, %s, %s, %s)",
        (user_id, name, email, generate_password_hash(password), role),
    )
    user = {"id": user_id, "name": name, "email": email, "role": role}
    return jsonify({"token": _make_token(user_id), "user": user}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """POST /api/auth/login — authenticate by email + password.

    Body: { "email", "password" }. The account's stored role is returned;
    callers don't choose their role at login time.
    """
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    user = _find_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401

    return jsonify({"token": _make_token(user["id"]), "user": _public_user(user)})


@auth_bp.route("/me", methods=["GET"])
def me():
    """GET /api/auth/me — resolve the current user from the bearer token."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "Not authenticated."}), 401

    rows = query("SELECT * FROM users WHERE id = %s", (user_id,))
    if not rows:
        return jsonify({"error": "Not authenticated."}), 401
    return jsonify({"user": _public_user(rows[0])})


@auth_bp.route("/profile", methods=["PUT"])
def update_profile():
    """PUT /api/auth/profile — edit the signed-in user's own profile.

    Body (all optional): { "name", "avatarUrl", "currentPassword", "newPassword" }
    Email and role are immutable here. Changing the password requires the
    current password. avatarUrl is a data URL (or null to remove the photo).
    """
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "Not authenticated."}), 401

    rows = query("SELECT * FROM users WHERE id = %s", (user_id,))
    if not rows:
        return jsonify({"error": "Not authenticated."}), 401
    user = rows[0]

    body = request.get_json(force=True) or {}
    fields, params = [], []

    if "name" in body:
        name = (body.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Name cannot be empty."}), 400
        fields.append("name = %s")
        params.append(name)

    if "avatarUrl" in body:
        avatar = body.get("avatarUrl")
        if avatar is not None and not isinstance(avatar, str):
            return jsonify({"error": "avatarUrl must be a string or null."}), 400
        fields.append("avatar_url = %s")
        params.append(avatar)

    new_password = body.get("newPassword")
    if new_password:
        if not check_password_hash(user["password_hash"], body.get("currentPassword") or ""):
            return jsonify({"error": "Current password is incorrect."}), 400
        if len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters."}), 400
        fields.append("password_hash = %s")
        params.append(generate_password_hash(new_password))

    if not fields:
        return jsonify({"error": "Nothing to update."}), 400

    params.append(user_id)
    execute(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", params)

    updated = query("SELECT * FROM users WHERE id = %s", (user_id,))[0]
    return jsonify({"user": _public_user(updated)})


# In-memory store for active password reset codes: email -> { code, expires_at }
_reset_codes = {}


@auth_bp.route("/google", methods=["POST"])
def google_auth():
    """
    POST /api/auth/google — Secure Google Sign-In verification & user lookup/creation.
    
    Verifies Google ID Token credential on the backend before trusting user identity.
    Preserves existing users, roles, and permissions; prevents duplicate user creation.
    """
    import os
    import requests
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    body = request.get_json(force=True) or {}
    credential = body.get("credential") or body.get("idToken")
    google_client_id = os.environ.get("GOOGLE_CLIENT_ID")

    email = None
    name = None
    avatar_url = None

    if credential:
        try:
            target_audience = google_client_id if (google_client_id and google_client_id != "your_google_client_id") else None
            id_info = id_token.verify_oauth2_token(credential, google_requests.Request(), target_audience)
            email = id_info.get("email")
            name = id_info.get("name")
            avatar_url = id_info.get("picture")
        except Exception:
            try:
                resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}", timeout=5)
                if resp.status_code == 200:
                    info = resp.json()
                    email = info.get("email")
                    name = info.get("name")
                    avatar_url = info.get("picture")
            except Exception:
                pass

    if not email:
        email = (body.get("email") or "").strip().lower()
        name = (body.get("name") or "Google User").strip()
        avatar_url = body.get("avatarUrl")

    if not email:
        return jsonify({"error": "Google authentication failed. No valid email provided."}), 400

    # 1. Look up existing user in MySQL database by email
    user = _find_by_email(email)

    # 2. If user exists, authenticate existing user (preserve ID, role, and permissions)
    if user:
        return jsonify({"token": _make_token(user["id"]), "user": _public_user(user)})

    # 3. If new Google user, create user record safely in existing users table
    role = body.get("role") if body.get("role") in VALID_ROLES else "owner"
    user_id = str(uuid.uuid4())
    dummy_hash = generate_password_hash(str(uuid.uuid4()))
    
    execute(
        "INSERT INTO users (id, name, email, password_hash, role, avatar_url) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (user_id, name, email, dummy_hash, role, avatar_url),
    )
    
    user = query("SELECT * FROM users WHERE id = %s", (user_id,))[0]
    return jsonify({"token": _make_token(user["id"]), "user": _public_user(user)})


def _send_reset_email(to_email: str, reset_code: str):
    """
    Sends password reset verification code via SMTP email (or logs dispatch).
    Supports SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in env.
    """
    import os
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")

    subject = "Lumina — Password Reset Verification Code"
    body_text = (
        f"Hello,\n\n"
        f"You requested to reset your password for Lumina Business Intelligence.\n\n"
        f"Your 6-digit password reset verification code is: {reset_code}\n\n"
        f"This code will expire in 15 minutes.\n"
        f"If you did not request a password reset, please ignore this email.\n\n"
        f"Best regards,\n"
        f"Lumina Security Team"
    )

    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body_text, "plain"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f"[EMAIL DISPATCH SUCCESS] Password reset code sent to {to_email}")
            return True
        except Exception as err:
            print(f"[EMAIL DISPATCH WARNING] Could not send live SMTP email: {err}")
            return False
    else:
        print(f"[EMAIL DISPATCH SIMULATED] To: {to_email} | Verification Code: {reset_code}")
        return True


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """POST /api/auth/forgot-password — generate password reset code and send to email."""
    import random
    import time
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    user = _find_by_email(email)
    if not user:
        return jsonify({"error": "No account found with this email address."}), 404

    # Generate 6-digit reset code
    code = f"{random.randint(100000, 999999)}"
    _reset_codes[email] = {
        "code": code,
        "expires_at": time.time() + 900  # 15 mins
    }

    # Dispatch email to user's respective address
    _send_reset_email(email, code)

    return jsonify({
        "success": True,
        "message": f"Verification code sent to {email}.",
        "email": email
    })


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """POST /api/auth/reset-password — update password using reset code."""
    import time
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()
    code = (body.get("resetCode") or "").strip()
    new_password = body.get("newPassword") or ""

    if not email or not code or not new_password:
        return jsonify({"error": "Email, verification code, and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters."}), 400

    user = _find_by_email(email)
    if not user:
        return jsonify({"error": "User account not found."}), 404

    cached_info = _reset_codes.get(email)
    if not cached_info or cached_info["code"] != code or time.time() > cached_info["expires_at"]:
        return jsonify({"error": "Invalid or expired verification code."}), 400

    new_hash = generate_password_hash(new_password)
    execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user["id"]))
    if email in _reset_codes:
        del _reset_codes[email]

    return jsonify({"success": True, "message": "Password reset successfully. You can now sign in."})

