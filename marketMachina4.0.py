import tensorflow as tf
from tensorflow.keras import backend as K
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import joblib
import os
import numpy as np
import pandas as pd
import ta
import yfinance as yf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from functools import lru_cache
import datetime

# ── GPU Configuration for RTX 5060 Ti ──────────────────────────────────────
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"Found {len(gpus)} GPU(s): {[g.name for g in gpus]}")
    except RuntimeError as e:
        print(e)
else:
    print("No GPUs found — running on CPU")

# Mixed precision: float16 compute with float32 accumulation (great for RTX 50-series)
tf.keras.mixed_precision.set_global_policy('mixed_float16')
print(f"Compute dtype: {tf.keras.mixed_precision.global_policy().compute_dtype}")
print(f"Variable dtype: {tf.keras.mixed_precision.global_policy().variable_dtype}")

tf.get_logger().setLevel('ERROR')

# ── Constants ───────────────────────────────────────────────────────────────
#TICKER = "AAPL"
TICKER = "DDOG"

N_STEPS = 50
LOOKUP_STEP = 1

now = datetime.datetime.now()
todays_date = datetime.date.today()
year_number, week_number, _ = now.isocalendar()
month_number = todays_date.month

os.makedirs("models", exist_ok=True)
os.makedirs("scalers", exist_ok=True)


# ── Data Download ───────────────────────────────────────────────────────────
def download_data(ticker, primary_period='5y', fallback_period='max'):
    data = yf.Ticker(ticker)
    try:
        df = data.history(period=primary_period, interval='1d')
        if df.empty:
            raise ValueError(f"No data for {ticker} with period {primary_period}.")
    except Exception as e:
        print(f"{ticker}: {e} — trying {fallback_period}")
        df = data.history(period=fallback_period, interval='1d')
        if df.empty:
            raise ValueError(f"No data for {ticker} at all.")
    return df


def get_current_price(ticker):
    intraday = yf.Ticker(ticker).history(period='1d', interval='1m')
    if not intraday.empty:
        return intraday['Close'].iloc[-1]
    return None


@lru_cache(maxsize=16)
def get_yesterday_price(ticker):
    hist = yf.Ticker(ticker).history(period='5d')
    if len(hist) < 2:
        return None
    return hist['Close'].iloc[-2]


# ── Feature Engineering ─────────────────────────────────────────────────────
def add_technical_indicators(df):
    # ── Trend ───────────────────────────────────────────────────────────────
    df['EMA_20'] = ta.trend.EMAIndicator(df['Close'], window=20).ema_indicator()
    df['EMA_50'] = ta.trend.EMAIndicator(df['Close'], window=50).ema_indicator()
    df['EMA_90'] = ta.trend.EMAIndicator(df['Close'], window=90).ema_indicator()
    df['ADX'] = ta.trend.ADXIndicator(df['High'], df['Low'], df['Close'], window=14).adx()

    macd = ta.trend.MACD(df['Close'], window_slow=26, window_fast=12, window_sign=9)
    df['MACD'] = macd.macd()
    df['MACD_signal'] = macd.macd_signal()
    df['MACD_hist'] = macd.macd_diff()

    # ── Momentum ────────────────────────────────────────────────────────────
    df['RSI'] = ta.momentum.RSIIndicator(df['Close'], window=14).rsi()
    df['Stoch_RSI'] = ta.momentum.StochRSIIndicator(df['Close'], window=14).stochrsi()
    df['ROC_5'] = ta.momentum.ROCIndicator(df['Close'], window=5).roc()
    df['ROC_20'] = ta.momentum.ROCIndicator(df['Close'], window=20).roc()

    # ── Volatility ──────────────────────────────────────────────────────────
    bb = ta.volatility.BollingerBands(df['Close'], window=20, window_dev=2)
    df['BB_upper'] = bb.bollinger_hband()
    df['BB_middle'] = bb.bollinger_mavg()
    df['BB_lower'] = bb.bollinger_lband()
    # BB width & %B give the LSTM relative positioning info
    df['BB_width'] = (df['BB_upper'] - df['BB_lower']) / df['BB_middle']
    df['BB_pct'] = (df['Close'] - df['BB_lower']) / (df['BB_upper'] - df['BB_lower'])

    df['ATR'] = ta.volatility.AverageTrueRange(df['High'], df['Low'], df['Close'], window=14).average_true_range()

    # ── Volume ──────────────────────────────────────────────────────────────
    df['OBV'] = ta.volume.OnBalanceVolumeIndicator(df['Close'], df['Volume']).on_balance_volume()
    df['Volume_SMA_20'] = df['Volume'].rolling(window=20).mean()
    df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA_20']  # volume spike detection

    # ── Price context ───────────────────────────────────────────────────────
    df['High_Low_Range'] = df['High'] - df['Low']
    df['Close_Open_Diff'] = df['Close'] - df['Open']

    # Drop raw columns the LSTM shouldn't see directly (already captured by indicators)
    df.drop(columns=['Open', 'Low', 'High', 'Volume', 'Stock Splits', 'Dividends',
                      'BB_upper', 'BB_lower', 'BB_middle', 'Volume_SMA_20'],
            inplace=True, errors='ignore')
    df.dropna(inplace=True)

    return df


# ── Dataset Creation ────────────────────────────────────────────────────────
def create_dataset(X, Y, n_steps):
    Xs, Ys = [], []
    for i in range(len(X) - n_steps):
        Xs.append(X[i:(i + n_steps)])
        Ys.append(Y[i + n_steps])
    return np.array(Xs), np.array(Ys)


# ── Model ───────────────────────────────────────────────────────────────────
def build_and_train_model(ticker, data, n_steps, test_size=0.1, random_state=42):
    K.clear_session()

    scaler_feature = MinMaxScaler()
    scaler_target = MinMaxScaler()

    features = scaler_feature.fit_transform(data.drop(['Close'], axis=1))
    target = scaler_target.fit_transform(data[['Close']].values)

    X, Y = create_dataset(features, target.ravel(), n_steps)
    if len(X) < 10:
        raise ValueError("Not enough data for training and validation.")

    X_train, X_val, Y_train, Y_val = train_test_split(
        X, Y, test_size=test_size, random_state=random_state
    )
    batch_size = min(64, len(X_train))

    model = Sequential([
        LSTM(60, return_sequences=True, input_shape=(n_steps, X_train.shape[2])),
        Dropout(0.3),
        LSTM(120, return_sequences=False),
        Dropout(0.3),
        Dense(20),
        Dense(1, dtype='float32'),  # output in float32 for numerical stability
    ])

    model.compile(loss='mean_squared_error', optimizer='adam', metrics=['mae'])

    early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

    history = model.fit(
        X_train, Y_train,
        epochs=50,
        batch_size=batch_size,
        verbose=1,
        validation_data=(X_val, Y_val),
        callbacks=[early_stopping],
    )

    val_loss = history.history.get('val_loss', [None])[-1]
    val_preds = model.predict(X_val)
    mae = mean_absolute_error(Y_val, val_preds)
    mse = mean_squared_error(Y_val, val_preds)
    rmse = np.sqrt(mse)

    with open('model_metrics.txt', 'a') as f:
        f.write(f"Ticker: {ticker} | Val Loss: {val_loss} | MAE: {mae} | MSE: {mse} | RMSE: {rmse}\n")

    return model, scaler_feature, scaler_target, val_loss, mae, mse, rmse


# ── Helpers ─────────────────────────────────────────────────────────────────
def calculate_percentage_increase(current_price, predicted_price):
    return ((predicted_price - current_price) / current_price) * 100


def get_action(predicted_price, current_price):
    return "BUY" if predicted_price > current_price * 1.005 else "HOLD"


# ── Main ────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"  Stock Predictor — {TICKER}")
    print(f"{'='*60}\n")

    # 1. Download & prepare data
    df = download_data(TICKER)
    df = add_technical_indicators(df)
    print(f"Data shape after indicators: {df.shape}")

    # 2. Load or train model
    model_path = f"models/{year_number}_{month_number}_{TICKER}_model.keras"
    scaler_feat_path = f"scalers/{year_number}_{month_number}_{TICKER}_scaler_feature.pkl"
    scaler_tgt_path = f"scalers/{year_number}_{month_number}_{TICKER}_scaler_target.pkl"

    try:
        model = load_model(model_path)
        scaler_feature = joblib.load(scaler_feat_path)
        scaler_target = joblib.load(scaler_tgt_path)
        print("Loaded cached model & scalers.")
    except (IOError, FileNotFoundError, ValueError):
        print("Training new model...")
        model, scaler_feature, scaler_target, val_loss, mae, mse, rmse = \
            build_and_train_model(TICKER, df, N_STEPS)
        model.save(model_path)
        joblib.dump(scaler_feature, scaler_feat_path)
        joblib.dump(scaler_target, scaler_tgt_path)
        print(f"Val Loss: {val_loss:.6f} | MAE: {mae:.6f} | RMSE: {rmse:.6f}")

    # 3. Predict next close
    features = scaler_feature.transform(df.drop(['Close'], axis=1))
    current_seq = features[-N_STEPS:].reshape(1, N_STEPS, features.shape[1])

    predicted_scaled = model.predict(current_seq, verbose=0)
    predicted_price = scaler_target.inverse_transform(predicted_scaled)[0, 0]

    current_price = get_current_price(TICKER)
    yesterday_price = get_yesterday_price(TICKER)

    if current_price is not None:
        pct_change = calculate_percentage_increase(current_price, predicted_price)
        action = get_action(predicted_price, current_price)

        print(f"\n{'─'*60}")
        print(f"  {TICKER} Results")
        print(f"{'─'*60}")
        print(f"  Current Price:   ${current_price:.2f}")
        print(f"  Yesterday Close: ${yesterday_price:.2f}" if yesterday_price else "  Yesterday Close: N/A")
        print(f"  Predicted Close: ${predicted_price:.2f}")
        print(f"  Change:          {pct_change:+.3f}%")
        print(f"  Signal:          {action}")
        print(f"{'─'*60}\n")
    else:
        print(f"Could not fetch current price for {TICKER}")

    K.clear_session()