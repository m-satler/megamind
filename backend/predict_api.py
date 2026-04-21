"""
Prediction endpoint that wraps the *original* marketMachina4.0.py as-is.

The file is loaded via importlib.util (its name contains a '.' so it can't be
imported with normal `import marketMachina4.0`). We call the functions it
already exposes; the file itself is NEVER modified.
"""
import datetime
import importlib.util
import os
import threading
from functools import lru_cache

from flask import Blueprint, jsonify

predict_bp = Blueprint("predict", __name__)

# ── Load the original module ───────────────────────────────────────────────
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_ORIG_PATH = os.path.join(_BASE_DIR, "marketMachina4.0.py")

_mm = None  # lazy-loaded module handle
_load_lock = threading.Lock()


def _load_market_machina():
    """Import marketMachina4.0.py lazily. TensorFlow import is slow."""
    global _mm
    if _mm is not None:
        return _mm
    with _load_lock:
        if _mm is not None:
            return _mm
        spec = importlib.util.spec_from_file_location("market_machina", _ORIG_PATH)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"Could not load {_ORIG_PATH}")
        mod = importlib.util.module_from_spec(spec)
        # Loading the module runs its top-level code (GPU setup, mixed precision,
        # etc.) but NOT the `if __name__ == '__main__':` block — so it's safe.
        spec.loader.exec_module(mod)
        _mm = mod
        return mod


# ── Cache (model, scalers, features) per ticker ───────────────────────────
# marketMachina4.0.py writes models to models/{yyyy}_{mm}_{TICKER}_model.keras
# relative to CWD. We replicate its path convention here so we can detect
# whether a cached model already exists on disk.
_MODELS_DIR = os.path.join(_BASE_DIR, "models")
_SCALERS_DIR = os.path.join(_BASE_DIR, "scalers")


def _cached_paths(ticker: str):
    now = datetime.datetime.now()
    year, _, _ = now.isocalendar()
    month = datetime.date.today().month
    prefix = f"{year}_{month}_{ticker.upper()}"
    return (
        os.path.join(_MODELS_DIR, f"{prefix}_model.keras"),
        os.path.join(_SCALERS_DIR, f"{prefix}_scaler_feature.pkl"),
        os.path.join(_SCALERS_DIR, f"{prefix}_scaler_target.pkl"),
    )


@lru_cache(maxsize=16)
def _predict_for_ticker(ticker: str) -> dict:
    """
    Call through to marketMachina4.0.py's own functions. Result is cached
    per-process to avoid re-predicting on every HTTP hit.
    """
    import joblib
    import numpy as np
    from tensorflow.keras.models import load_model

    mm = _load_market_machina()
    ticker = ticker.upper()

    # Ensure the model/scaler dirs the original script uses exist.
    os.makedirs(_MODELS_DIR, exist_ok=True)
    os.makedirs(_SCALERS_DIR, exist_ok=True)
    # The script saves relative to CWD. Chdir to repo root for one call so the
    # paths line up with how the standalone script writes them.
    prev_cwd = os.getcwd()
    os.chdir(_BASE_DIR)
    try:
        df = mm.download_data(ticker)
        df = mm.add_technical_indicators(df)

        model_path, feat_path, tgt_path = _cached_paths(ticker)
        if os.path.exists(model_path) and os.path.exists(feat_path) and os.path.exists(tgt_path):
            model = load_model(model_path)
            scaler_feature = joblib.load(feat_path)
            scaler_target = joblib.load(tgt_path)
            cached = True
            train_metrics = {}
        else:
            model, scaler_feature, scaler_target, val_loss, mae, mse, rmse = \
                mm.build_and_train_model(ticker, df, mm.N_STEPS)
            model.save(model_path)
            joblib.dump(scaler_feature, feat_path)
            joblib.dump(scaler_target, tgt_path)
            cached = False
            train_metrics = {
                "val_loss": float(val_loss) if val_loss is not None else None,
                "mae":      float(mae),
                "rmse":     float(rmse),
            }

        features = scaler_feature.transform(df.drop(["Close"], axis=1))
        if len(features) < mm.N_STEPS:
            raise ValueError(f"Not enough history for {ticker}")
        current_seq = features[-mm.N_STEPS:].reshape(1, mm.N_STEPS, features.shape[1])
        scaled_pred = model.predict(current_seq, verbose=0)
        predicted_price = float(scaler_target.inverse_transform(scaled_pred)[0, 0])

        current_price = mm.get_current_price(ticker)
        if current_price is None:
            current_price = float(df["Close"].iloc[-1])
        current_price = float(current_price)

        pct_change = mm.calculate_percentage_increase(current_price, predicted_price)
        signal = mm.get_action(predicted_price, current_price)

        return {
            "ticker":         ticker,
            "currentPrice":   round(current_price, 2),
            "predictedPrice": round(predicted_price, 2),
            "pctChange":      round(float(pct_change), 3),
            "signal":         signal,
            "metrics":        {"cached": cached, **train_metrics},
        }
    finally:
        os.chdir(prev_cwd)


# ── Route ──────────────────────────────────────────────────────────────────
@predict_bp.route("/api/predict/<ticker>", methods=["GET"])
def predict_route(ticker):
    try:
        return jsonify(_predict_for_ticker(ticker)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500
