import os
import psycopg2
from flask import Blueprint, request, jsonify
from auth import token_required

watchlist_bp = Blueprint("watchlist", __name__)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/megamind")


def get_db():
    return psycopg2.connect(DB_URL)


@watchlist_bp.route("/api/watchlist", methods=["GET"])
@token_required
def get_watchlist(user_id):
    """Get all stocks in the user's watchlist."""
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT watchlist_id, ticker, company_name, added_at
            FROM watchlist
            WHERE user_id = %s
            ORDER BY added_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    stocks = [
        {
            "watchlist_id": str(row[0]),
            "ticker":       row[1],
            "company_name": row[2],
            "added_at":     row[3].isoformat(),
        }
        for row in rows
    ]
    return jsonify({"watchlist": stocks}), 200


@watchlist_bp.route("/api/watchlist", methods=["POST"])
@token_required
def add_to_watchlist(user_id):
    """Add a stock to the user's watchlist."""
    data         = request.get_json(silent=True) or {}
    ticker       = (data.get("ticker") or "").strip().upper()
    company_name = (data.get("company_name") or "").strip()

    if not ticker:
        return jsonify({"error": "Ticker symbol is required"}), 400

    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            """
            INSERT INTO watchlist (user_id, ticker, company_name)
            VALUES (%s, %s, %s)
            RETURNING watchlist_id, ticker, company_name, added_at
            """,
            (user_id, ticker, company_name or None),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": f"{ticker} is already in your watchlist"}), 409
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    return jsonify({
        "message":     f"{ticker} added to watchlist",
        "watchlist_id": str(row[0]),
        "ticker":       row[1],
        "company_name": row[2],
        "added_at":     row[3].isoformat(),
    }), 201


@watchlist_bp.route("/api/watchlist/<ticker>", methods=["DELETE"])
@token_required
def remove_from_watchlist(user_id, ticker):
    """Remove a stock from the user's watchlist."""
    ticker = ticker.upper()

    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            "DELETE FROM watchlist WHERE user_id = %s AND ticker = %s RETURNING ticker",
            (user_id, ticker),
        )
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    if not deleted:
        return jsonify({"error": f"{ticker} not found in your watchlist"}), 404

    return jsonify({"message": f"{ticker} removed from watchlist"}), 200