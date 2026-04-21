import os
from datetime import datetime, timedelta

import bcrypt
import jwt
import psycopg2
from flask import Blueprint, request, jsonify
from functools import wraps

auth_bp = Blueprint("auth", __name__)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/megamind")
JWT_SECRET = os.environ.get("JWT_SECRET", "change_me_in_production")
JWT_EXPIRY_HOURS = 24


def get_db():
    return psycopg2.connect(DB_URL)


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(user_id=payload["sub"], *args, **kwargs)
    return decorated


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    balance  = data.get("starting_balance", 0)

    if not email or "@" not in email:
        return jsonify({"error": "Invalid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    try:
        balance = float(balance)
        if balance < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Starting balance must be a non-negative number"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:
        conn = get_db()
        cur  = conn.cursor()

        cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING user_id, created_at",
            (email, pw_hash),
        )
        row = cur.fetchone()
        user_id    = str(row[0])
        created_at = row[1].isoformat()

        cur.execute("INSERT INTO accounts (user_id, balance) VALUES (%s, %s)", (user_id, balance))
        cur.execute("INSERT INTO user_profiles (user_id) VALUES (%s)", (user_id,))

        conn.commit()
        cur.close()
        conn.close()

    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "An account with this email already exists"}), 409
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    token = make_token(user_id)
    return jsonify({
        "token":      token,
        "user_id":    user_id,
        "email":      email,
        "balance":    balance,
        "created_at": created_at,
    }), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("SELECT user_id, password_hash FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    if row is None or not bcrypt.checkpw(password.encode(), row[1].encode()):
        cur.close(); conn.close()
        return jsonify({"error": "Invalid email or password"}), 401

    user_id = str(row[0])

    cur.execute("UPDATE users SET last_login = NOW() WHERE user_id = %s", (user_id,))
    cur.execute("SELECT balance FROM accounts WHERE user_id = %s", (user_id,))
    balance_row = cur.fetchone()
    balance = float(balance_row[0]) if balance_row else 0.0

    conn.commit()
    cur.close()
    conn.close()

    token = make_token(user_id)
    return jsonify({
        "token":   token,
        "user_id": user_id,
        "email":   email,
        "balance": balance,
    }), 200


@auth_bp.route("/api/auth/me", methods=["GET"])
@token_required
def me(user_id):
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("SELECT email, created_at, last_login FROM users WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.execute("SELECT balance FROM accounts WHERE user_id = %s", (user_id,))
        bal = cur.fetchone()
        cur.execute(
            """
            SELECT annual_income, credit_score, experience_level, risk_tolerance,
                   investment_horizon, existing_holdings
            FROM user_profiles WHERE user_id = %s
            """,
            (user_id,),
        )
        prof = cur.fetchone()
        cur.close(); conn.close()
    except Exception:
        return jsonify({"error": "Database error"}), 500

    if not row:
        return jsonify({"error": "User not found"}), 404

    profile = None
    if prof:
        profile = {
            "annual_income":      float(prof[0]) if prof[0] is not None else None,
            "credit_score":       int(prof[1]) if prof[1] is not None else None,
            "experience_level":   prof[2],
            "risk_tolerance":     prof[3],
            "investment_horizon": prof[4],
            "existing_holdings":  prof[5],
        }

    return jsonify({
        "user_id":    user_id,
        "email":      row[0],
        "created_at": row[1].isoformat() if row[1] else None,
        "last_login": row[2].isoformat() if row[2] else None,
        "balance":    float(bal[0]) if bal else 0.0,
        "profile":    profile,
        "profile_complete": bool(profile and profile["risk_tolerance"] and profile["experience_level"]),
    })


@auth_bp.route("/api/auth/profile", methods=["PUT"])
@token_required
def update_profile(user_id):
    """Upsert survey / account-setup data into user_profiles."""
    data = request.get_json(silent=True) or {}

    annual_income      = data.get("annual_income")
    credit_score       = data.get("credit_score")
    experience_level   = (data.get("experience_level") or "").strip() or None
    risk_tolerance     = (data.get("risk_tolerance") or "").strip() or None
    investment_horizon = (data.get("investment_horizon") or "").strip() or None
    existing_holdings  = data.get("existing_holdings")  # JSON-serializable

    # Basic validation
    if experience_level and experience_level not in ("beginner", "intermediate", "advanced"):
        return jsonify({"error": "experience_level must be beginner/intermediate/advanced"}), 400
    if risk_tolerance and risk_tolerance not in ("low", "medium", "high"):
        return jsonify({"error": "risk_tolerance must be low/medium/high"}), 400
    if investment_horizon and investment_horizon not in ("short", "medium", "long"):
        return jsonify({"error": "investment_horizon must be short/medium/long"}), 400

    try:
        if annual_income is not None:
            annual_income = float(annual_income)
        if credit_score is not None:
            credit_score = int(credit_score)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid numeric field"}), 400

    import json as _json
    holdings_json = _json.dumps(existing_holdings) if existing_holdings is not None else None

    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("SELECT profile_id FROM user_profiles WHERE user_id = %s", (user_id,))
        existing = cur.fetchone()
        if existing:
            cur.execute(
                """
                UPDATE user_profiles
                   SET annual_income      = COALESCE(%s, annual_income),
                       credit_score       = COALESCE(%s, credit_score),
                       experience_level   = COALESCE(%s, experience_level),
                       risk_tolerance     = COALESCE(%s, risk_tolerance),
                       investment_horizon = COALESCE(%s, investment_horizon),
                       existing_holdings  = COALESCE(%s::jsonb, existing_holdings)
                 WHERE user_id = %s
                """,
                (annual_income, credit_score, experience_level, risk_tolerance,
                 investment_horizon, holdings_json, user_id),
            )
        else:
            cur.execute(
                """
                INSERT INTO user_profiles
                    (user_id, annual_income, credit_score, experience_level,
                     risk_tolerance, investment_horizon, existing_holdings)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (user_id, annual_income, credit_score, experience_level,
                 risk_tolerance, investment_horizon, holdings_json),
            )
        conn.commit()
        cur.close(); conn.close()
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    return jsonify({"message": "Profile updated"}), 200