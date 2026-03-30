import os
import psycopg2
from flask import Blueprint, request, jsonify
from auth import token_required

trades_bp = Blueprint("trades", __name__)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/megamind")


def get_db():
    return psycopg2.connect(DB_URL)


def get_or_create_portfolio(cur, user_id):
    """Get existing portfolio or create one for the user."""
    cur.execute("SELECT portfolio_id FROM portfolio WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    if row:
        return str(row[0])
    cur.execute(
        "INSERT INTO portfolio (user_id) VALUES (%s) RETURNING portfolio_id",
        (user_id,),
    )
    return str(cur.fetchone()[0])


@trades_bp.route("/api/trades/buy", methods=["POST"])
@token_required
def buy_stock(user_id):
    data         = request.get_json(silent=True) or {}
    ticker       = (data.get("ticker") or "").strip().upper()
    company_name = (data.get("company_name") or "").strip()
    shares       = data.get("shares")
    price        = data.get("price_per_share")

    # --- validation ---
    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400
    try:
        shares = float(shares)
        price  = float(price)
        if shares <= 0 or price <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Shares and price must be positive numbers"}), 400

    total = round(shares * price, 2)

    try:
        conn = get_db()
        cur  = conn.cursor()

        # check balance
        cur.execute("SELECT balance FROM accounts WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        if not row or float(row[0]) < total:
            cur.close(); conn.close()
            return jsonify({"error": "Insufficient balance"}), 400

        # deduct balance
        cur.execute(
            "UPDATE accounts SET balance = balance - %s WHERE user_id = %s",
            (total, user_id),
        )

        # get or create portfolio
        portfolio_id = get_or_create_portfolio(cur, user_id)

        # add or update portfolio item
        cur.execute(
            """
            INSERT INTO portfolio_items (portfolio_id, ticker, company_name, shares_held, purchase_price)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (portfolio_id, ticker)
            DO UPDATE SET shares_held = portfolio_items.shares_held + EXCLUDED.shares_held
            """,
            (portfolio_id, ticker, company_name or None, shares, price),
        )

        # auto-save to watchlist
        cur.execute(
            """
            INSERT INTO watchlist (user_id, ticker, company_name)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, ticker) DO NOTHING
            """,
            (user_id, ticker, company_name or None),
        )

        # log transaction
        cur.execute(
            """
            INSERT INTO transactions (user_id, ticker, type, shares, price_per_share, total_amount)
            VALUES (%s, %s, 'BUY', %s, %s, %s)
            """,
            (user_id, ticker, shares, price, total),
        )

        # get updated balance
        cur.execute("SELECT balance FROM accounts WHERE user_id = %s", (user_id,))
        new_balance = float(cur.fetchone()[0])

        conn.commit()
        cur.close()
        conn.close()

    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    return jsonify({
        "message":     f"Bought {shares} shares of {ticker}",
        "ticker":      ticker,
        "shares":      shares,
        "price":       price,
        "total":       total,
        "new_balance": new_balance,
    }), 201


@trades_bp.route("/api/trades/sell", methods=["POST"])
@token_required
def sell_stock(user_id):
    data   = request.get_json(silent=True) or {}
    ticker = (data.get("ticker") or "").strip().upper()
    shares = data.get("shares")
    price  = data.get("price_per_share")

    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400
    try:
        shares = float(shares)
        price  = float(price)
        if shares <= 0 or price <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Shares and price must be positive numbers"}), 400

    total = round(shares * price, 2)

    try:
        conn = get_db()
        cur  = conn.cursor()

        # check shares owned
        cur.execute(
            """
            SELECT pi.item_id, pi.shares_held
            FROM portfolio_items pi
            JOIN portfolio p ON p.portfolio_id = pi.portfolio_id
            WHERE p.user_id = %s AND pi.ticker = %s
            """,
            (user_id, ticker),
        )
        row = cur.fetchone()
        if not row or float(row[1]) < shares:
            cur.close(); conn.close()
            return jsonify({"error": f"Insufficient shares of {ticker}"}), 400

        item_id     = row[0]
        shares_left = float(row[1]) - shares

        # update or remove portfolio item
        if shares_left == 0:
            cur.execute("DELETE FROM portfolio_items WHERE item_id = %s", (item_id,))
        else:
            cur.execute(
                "UPDATE portfolio_items SET shares_held = %s WHERE item_id = %s",
                (shares_left, item_id),
            )

        # add proceeds to balance
        cur.execute(
            "UPDATE accounts SET balance = balance + %s WHERE user_id = %s",
            (total, user_id),
        )

        # log transaction
        cur.execute(
            """
            INSERT INTO transactions (user_id, ticker, type, shares, price_per_share, total_amount)
            VALUES (%s, %s, 'SELL', %s, %s, %s)
            """,
            (user_id, ticker, shares, price, total),
        )

        # get updated balance
        cur.execute("SELECT balance FROM accounts WHERE user_id = %s", (user_id,))
        new_balance = float(cur.fetchone()[0])

        conn.commit()
        cur.close()
        conn.close()

    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    return jsonify({
        "message":     f"Sold {shares} shares of {ticker}",
        "ticker":      ticker,
        "shares":      shares,
        "price":       price,
        "total":       total,
        "new_balance": new_balance,
    }), 200


@trades_bp.route("/api/portfolio", methods=["GET"])
@token_required
def get_portfolio(user_id):
    """Get all stocks in the user's portfolio."""
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT pi.ticker, pi.company_name, pi.shares_held, pi.purchase_price, pi.purchased_at
            FROM portfolio_items pi
            JOIN portfolio p ON p.portfolio_id = pi.portfolio_id
            WHERE p.user_id = %s
            ORDER BY pi.purchased_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        cur.execute("SELECT balance FROM accounts WHERE user_id = %s", (user_id,))
        bal = cur.fetchone()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    items = [
        {
            "ticker":         row[0],
            "company_name":   row[1],
            "shares_held":    float(row[2]),
            "purchase_price": float(row[3]),
            "purchased_at":   row[4].isoformat(),
        }
        for row in rows
    ]
    return jsonify({
        "portfolio": items,
        "balance":   float(bal[0]) if bal else 0.0,
    }), 200


@trades_bp.route("/api/trades/history", methods=["GET"])
@token_required
def get_history(user_id):
    """Get full transaction history for the user."""
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT ticker, type, shares, price_per_share, total_amount, executed_at
            FROM transactions
            WHERE user_id = %s
            ORDER BY executed_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    history = [
        {
            "ticker":          row[0],
            "type":            row[1],
            "shares":          float(row[2]),
            "price_per_share": float(row[3]),
            "total_amount":    float(row[4]),
            "executed_at":     row[5].isoformat(),
        }
        for row in rows
    ]
    return jsonify({"history": history}), 200