"""
Alerts endpoint — derives watchlist price-change alerts on demand.

For each ticker in the authenticated user's watchlist, we fetch the last few
trading days of OHLC data via yfinance and emit:

  * "pre-open"  : previous close → today's open (overnight gap)
  * "post-close": today's open   → today's close (intraday move)

An alert is emitted when abs(pct_change) >= THRESHOLD (default 2.0 %).

Alerts are computed live — nothing is stored. The frontend polls this
endpoint when the user opens the Alerts page, and again if they click the
REFRESH button.
"""

import os
import time
from datetime import datetime, timezone

import psycopg2
import yfinance as yf
from flask import Blueprint, request, jsonify

from auth import token_required

alerts_bp = Blueprint("alerts", __name__)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/megamind")

# in-process cache shared across requests (keyed by ticker)
_CACHE: dict = {}
_CACHE_TTL = 5 * 60  # 5 minutes


def _get_db():
    return psycopg2.connect(DB_URL)


def _watchlist_tickers(user_id: str):
    conn = _get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT ticker, company_name FROM watchlist WHERE user_id = %s ORDER BY added_at",
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows  # [(ticker, company_name), ...]


def _fetch_recent(ticker: str):
    """Return last 5 daily OHLC rows or None on failure. Cached for 5 min."""
    entry = _CACHE.get(ticker)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]

    try:
        hist = yf.Ticker(ticker).history(period="7d", interval="1d")
    except Exception:
        return None
    if hist is None or hist.empty or len(hist) < 2:
        return None

    # Keep only the cols we care about and normalise to plain python values.
    rows = []
    for idx, row in hist.tail(5).iterrows():
        rows.append(
            {
                "date": idx.strftime("%Y-%m-%d"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]) if row["Volume"] else 0,
            }
        )
    _CACHE[ticker] = (time.time(), rows)
    return rows


def _severity(pct: float) -> str:
    """Bucket magnitude so the UI can colour-code."""
    mag = abs(pct)
    if mag >= 5.0:
        return "high"
    if mag >= 2.0:
        return "medium"
    return "low"


@alerts_bp.route("/api/alerts", methods=["GET"])
@token_required
def list_alerts(user_id):
    try:
        threshold = float(request.args.get("threshold", "2.0"))
    except ValueError:
        threshold = 2.0

    try:
        tickers = _watchlist_tickers(user_id)
    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    alerts = []
    for ticker, company_name in tickers:
        rows = _fetch_recent(ticker)
        if not rows or len(rows) < 2:
            continue

        last = rows[-1]       # most recent trading day (today if market closed)
        prev = rows[-2]       # the trading day before that

        # ── Post-close: today's open → today's close ────────────────────
        intraday_pct = 0.0
        if last["open"]:
            intraday_pct = (last["close"] - last["open"]) / last["open"] * 100.0
        if abs(intraday_pct) >= threshold:
            direction = "up" if intraday_pct > 0 else "down"
            alerts.append(
                {
                    "id": f"{ticker}-close-{last['date']}",
                    "ticker": ticker,
                    "company_name": company_name,
                    "session": "post-close",
                    "date": last["date"],
                    "from_price": round(last["open"], 2),
                    "to_price": round(last["close"], 2),
                    "pct_change": round(intraday_pct, 2),
                    "severity": _severity(intraday_pct),
                    "message": (
                        f"{ticker} closed {direction} {abs(intraday_pct):.2f}% "
                        f"(${last['open']:.2f} → ${last['close']:.2f}) on {last['date']}"
                    ),
                    "timestamp": f"{last['date']}T16:00:00-05:00",
                }
            )

        # ── Pre-open: prev close → today's open (overnight gap) ─────────
        if prev["close"]:
            gap_pct = (last["open"] - prev["close"]) / prev["close"] * 100.0
            if abs(gap_pct) >= threshold:
                direction = "up" if gap_pct > 0 else "down"
                alerts.append(
                    {
                        "id": f"{ticker}-gap-{last['date']}",
                        "ticker": ticker,
                        "company_name": company_name,
                        "session": "pre-open",
                        "date": last["date"],
                        "from_price": round(prev["close"], 2),
                        "to_price": round(last["open"], 2),
                        "pct_change": round(gap_pct, 2),
                        "severity": _severity(gap_pct),
                        "message": (
                            f"{ticker} gapped {direction} {abs(gap_pct):.2f}% overnight "
                            f"(${prev['close']:.2f} → ${last['open']:.2f}) on {last['date']}"
                        ),
                        "timestamp": f"{last['date']}T09:30:00-05:00",
                    }
                )

    # newest first
    alerts.sort(key=lambda a: a["timestamp"], reverse=True)

    return jsonify(
        {
            "alerts": alerts,
            "threshold": threshold,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "watched_count": len(tickers),
        }
    ), 200
