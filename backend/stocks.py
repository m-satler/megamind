"""
Public market-data endpoints backed by yfinance.

These routes do NOT require authentication — the home page and stock detail
view fetch data here so unauthenticated visitors can still browse.
"""
import time
from flask import Blueprint, request, jsonify
import yfinance as yf

stocks_bp = Blueprint("stocks", __name__)

# ── Simple in-process cache ────────────────────────────────────────────────
# yfinance calls are slow and rate-limited. Cache results for a short TTL.
_CACHE: dict = {}
_QUOTE_TTL = 60          # 1 minute for quotes
_DETAIL_TTL = 5 * 60     # 5 minutes for company metadata
_HISTORY_TTL = 10 * 60   # 10 minutes for historical data


def _cache_get(key: str, ttl: int):
    entry = _CACHE.get(key)
    if entry and (time.time() - entry[0]) < ttl:
        return entry[1]
    return None


def _cache_set(key: str, value):
    _CACHE[key] = (time.time(), value)


# ── Helpers ────────────────────────────────────────────────────────────────
def _fmt_market_cap(value) -> str:
    if value is None:
        return "N/A"
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "N/A"
    if v >= 1e12:
        return f"{v / 1e12:.2f}T"
    if v >= 1e9:
        return f"{v / 1e9:.2f}B"
    if v >= 1e6:
        return f"{v / 1e6:.2f}M"
    return f"{v:.0f}"


def _fmt_volume(value) -> str:
    if value is None:
        return "N/A"
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "N/A"
    if v >= 1e9:
        return f"{v / 1e9:.2f}B"
    if v >= 1e6:
        return f"{v / 1e6:.2f}M"
    if v >= 1e3:
        return f"{v / 1e3:.2f}K"
    return f"{v:.0f}"


def _build_quote(ticker: str) -> dict | None:
    """Return a lightweight quote dict: price, change, changePercent, name."""
    t = yf.Ticker(ticker)
    hist = t.history(period="2d", interval="1d")
    if hist.empty:
        return None

    last_close = float(hist["Close"].iloc[-1])
    prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else last_close
    change = last_close - prev_close
    pct = (change / prev_close * 100) if prev_close else 0.0

    # Company name via fast_info fallback
    name = ticker
    try:
        info = t.info or {}
        name = info.get("shortName") or info.get("longName") or ticker
    except Exception:
        pass

    return {
        "symbol":        ticker,
        "name":          name,
        "price":         round(last_close, 2),
        "change":        round(change, 2),
        "changePercent": round(pct, 2),
    }


# ── Routes ─────────────────────────────────────────────────────────────────
@stocks_bp.route("/api/stocks/quote", methods=["GET"])
def batch_quotes():
    """
    GET /api/stocks/quote?tickers=AAPL,GOOGL,MSFT
    Returns a list of lightweight quotes. Failed tickers are omitted.
    """
    raw = request.args.get("tickers", "")
    tickers = [t.strip().upper() for t in raw.split(",") if t.strip()]
    if not tickers:
        return jsonify({"error": "Provide ?tickers=SYM1,SYM2"}), 400

    results = []
    for ticker in tickers:
        cached = _cache_get(f"quote:{ticker}", _QUOTE_TTL)
        if cached:
            results.append(cached)
            continue
        try:
            quote = _build_quote(ticker)
            if quote:
                _cache_set(f"quote:{ticker}", quote)
                results.append(quote)
        except Exception:
            # skip failing ticker rather than failing the whole request
            continue

    return jsonify({"quotes": results}), 200


@stocks_bp.route("/api/stocks/<ticker>", methods=["GET"])
def stock_detail(ticker):
    """
    GET /api/stocks/AAPL
    Detailed metadata used by the StockDetail page.
    """
    ticker = ticker.upper()
    cached = _cache_get(f"detail:{ticker}", _DETAIL_TTL)
    if cached:
        return jsonify(cached), 200

    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="1y", interval="1d")
        if hist.empty:
            return jsonify({"error": f"No data for {ticker}"}), 404

        last_close = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else last_close
        change = last_close - prev_close
        pct = (change / prev_close * 100) if prev_close else 0.0

        high_52 = float(hist["High"].max())
        low_52  = float(hist["Low"].min())

        info = {}
        try:
            info = t.info or {}
        except Exception:
            pass

        name = info.get("shortName") or info.get("longName") or ticker
        pe = info.get("trailingPE") or info.get("forwardPE")
        market_cap = info.get("marketCap")
        volume = info.get("volume") or info.get("averageVolume")

        detail = {
            "symbol":        ticker,
            "name":          name,
            "price":         round(last_close, 2),
            "change":        round(change, 2),
            "changePercent": round(pct, 2),
            "peRatio":       round(float(pe), 2) if pe else None,
            "marketCap":     _fmt_market_cap(market_cap),
            "volume":        _fmt_volume(volume),
            "high52Week":    round(high_52, 2),
            "low52Week":     round(low_52, 2),
        }
        _cache_set(f"detail:{ticker}", detail)
        return jsonify(detail), 200

    except Exception as e:
        return jsonify({"error": "Fetch failed", "detail": str(e)}), 500


@stocks_bp.route("/api/stocks/<ticker>/history", methods=["GET"])
def stock_history(ticker):
    """
    GET /api/stocks/AAPL/history?days=90
    Returns daily OHLCV series for charts.
    """
    ticker = ticker.upper()
    try:
        days = int(request.args.get("days", "90"))
    except ValueError:
        days = 90
    days = max(7, min(days, 730))

    cache_key = f"hist:{ticker}:{days}"
    cached = _cache_get(cache_key, _HISTORY_TTL)
    if cached:
        return jsonify(cached), 200

    # Map days → yfinance period string
    if days <= 30:
        period = "1mo"
    elif days <= 90:
        period = "3mo"
    elif days <= 180:
        period = "6mo"
    elif days <= 365:
        period = "1y"
    else:
        period = "2y"

    try:
        hist = yf.Ticker(ticker).history(period=period, interval="1d")
        if hist.empty:
            return jsonify({"error": f"No data for {ticker}"}), 404

        hist = hist.tail(days)
        candles = [
            {
                "date":   idx.strftime("%Y-%m-%d"),
                "open":   round(float(row["Open"]), 2),
                "high":   round(float(row["High"]), 2),
                "low":    round(float(row["Low"]), 2),
                "close":  round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,  # NaN check
            }
            for idx, row in hist.iterrows()
        ]

        payload = {"symbol": ticker, "candles": candles}
        _cache_set(cache_key, payload)
        return jsonify(payload), 200

    except Exception as e:
        return jsonify({"error": "Fetch failed", "detail": str(e)}), 500
