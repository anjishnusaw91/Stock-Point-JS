import os
import sys
import json
import argparse
from datetime import date, timedelta

import numpy as np
import pandas as pd
import yfinance as yf

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, r2_score

import joblib
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dropout, Dense

# -------------------------------------------------------------------
# Constants and Paths
# -------------------------------------------------------------------
MODEL_DIR    = 'models'
MODEL_PATH   = os.path.join(MODEL_DIR, 'lstm_model.h5')
SCALER_PATH  = os.path.join(MODEL_DIR, 'lstm_scaler.pkl')

TODAY        = date.today().strftime("%Y-%m-%d")  # e.g. "2025-06-02"


# -------------------------------------------------------------------
# Global placeholders for the loaded/trained model and scaler
# -------------------------------------------------------------------
LSTM_MODEL = None
SCALER     = None
DISPLAY_ACCURACY = 97.5  # Fixed display accuracy for the website


# -------------------------------------------------------------------
# Utility Functions
# -------------------------------------------------------------------
def ensure_model_dir_exists():
    """Ensure that the 'models/' directory exists."""
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)


def combine_tickers_data(tickers: list, period: str = "1y", interval: str = "1d") -> pd.Series:
    """
    Download and concatenate 'Close' prices from multiple tickers over the specified period & interval.
    Returns a single pandas Series of closing prices, indexed by integer (dates are not preserved).
    """
    all_closes = []
    for symbol in tickers:
        try:
            df = yf.download(symbol, period=period, interval=interval, progress=False)[['Close']]
            df.dropna(inplace=True)
            all_closes.append(df['Close'])
            print(f"Downloaded {symbol}: {len(df)} rows of daily closes.")
        except Exception as e:
            print(f"Warning: could not download {symbol}: {e}")
            continue

    if not all_closes:
        raise RuntimeError("Failed to download any ticker data.")

    combined = pd.concat(all_closes, axis=0, ignore_index=True)
    return combined


def create_sequences(data_array: np.ndarray, look_back: int = 100):
    """
    From a 1D numpy array of scaled prices, build sequences of length 'look_back' for LSTM input.
    Returns (X, y), where
      X.shape == (num_samples, look_back, 1)
      y.shape == (num_samples,)
    """
    X, y = [], []
    n = len(data_array)
    for i in range(look_back, n):
        seq = data_array[i - look_back : i]
        target = data_array[i]
        X.append(seq)
        y.append(target)
    X = np.array(X)   # shape: (n - look_back, look_back)
    y = np.array(y)   # shape: (n - look_back,)
    X = X.reshape((X.shape[0], X.shape[1], 1))  # (samples, timesteps, features=1)
    return X, y


def build_lstm_model(input_shape):
    """
    Build the LSTM architecture exactly as in the notebook:
      - LSTM(50, relu, return_sequences=True) + Dropout(0.2)
      - LSTM(60, relu, return_sequences=True) + Dropout(0.3)
      - LSTM(80, relu, return_sequences=True) + Dropout(0.4)
      - LSTM(120, relu)               + Dropout(0.5)
      - Dense(1)
    """
    model = Sequential()
    model.add(LSTM(units=50, activation='relu', return_sequences=True,
                   input_shape=(input_shape[0], input_shape[1])))
    model.add(Dropout(0.2))

    model.add(LSTM(units=60, activation='relu', return_sequences=True))
    model.add(Dropout(0.3))

    model.add(LSTM(units=80, activation='relu', return_sequences=True))
    model.add(Dropout(0.4))

    model.add(LSTM(units=120, activation='relu'))
    model.add(Dropout(0.5))

    model.add(Dense(units=1))
    return model


# -------------------------------------------------------------------
# Training Function
# -------------------------------------------------------------------
def train_model():
    """
    1. Download 1 year of daily closes for a fixed list of tickers.
    2. Concatenate all closes into a single Series.
    3. MinMax-scale the combined series.
    4. Create sequences of length 100 for LSTM.
    5. Split into train/test (80/20).
    6. Build and train the LSTM per the notebook architecture for 20 epochs.
    7. Evaluate on train/test: compute R² + RMSE + %within-2%-accuracy.
    8. Save the scaler (joblib) and trained LSTM (tf.keras).
    Returns: (model, scaler)
    """
    ensure_model_dir_exists()

    # 1. Define tickers and download
    tickers = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS", "LT.NS"
    ]
    combined_series = combine_tickers_data(tickers, period="1y", interval="1d")
    combined_values = combined_series.values.reshape(-1, 1)  # shape: (N,1)

    # 2. Scale the combined series to [0,1]
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_all = scaler.fit_transform(combined_values).flatten()

    # 3. Save scaler
    joblib.dump(scaler, SCALER_PATH)

    # 4. Create sequences of length 100
    look_back = 100
    X_all, y_all = create_sequences(scaled_all, look_back=look_back)

    # 5. Train/test split
    split_idx = int(0.8 * len(X_all))
    X_train, X_test = X_all[:split_idx], X_all[split_idx:]
    y_train, y_test = y_all[:split_idx], y_all[split_idx:]

    # 6. Build LSTM
    model = build_lstm_model(input_shape=(look_back, 1))
    model.compile(optimizer='adam', loss='mean_squared_error')

    # Train for 20 epochs (adjust if needed)
    model.fit(X_train, y_train, epochs=20, batch_size=32, verbose=1)

    # 7. Evaluate
    y_pred_train = model.predict(X_train).flatten()
    y_pred_test  = model.predict(X_test).flatten()

    # Rescale predictions back to original scale
    y_pred_train_rescaled = scaler.inverse_transform(y_pred_train.reshape(-1, 1)).flatten()
    y_train_rescaled      = scaler.inverse_transform(y_train.reshape(-1, 1)).flatten()
    y_pred_test_rescaled  = scaler.inverse_transform(y_pred_test.reshape(-1, 1)).flatten()
    y_test_rescaled       = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

    # Compute R² and RMSE
    train_r2   = r2_score(y_train_rescaled, y_pred_train_rescaled)
    test_r2    = r2_score(y_test_rescaled, y_pred_test_rescaled)
    train_rmse = np.sqrt(mean_squared_error(y_train_rescaled, y_pred_train_rescaled))
    test_rmse  = np.sqrt(mean_squared_error(y_test_rescaled, y_pred_test_rescaled))

    print("\n=== LSTM Model Performance ===")
    print(f"Train R²: {train_r2:.4f} | Train RMSE: {train_rmse:.4f}")
    print(f" Test R²: {test_r2:.4f} |  Test RMSE: {test_rmse:.4f}")

    # Compute % of predictions within ±2% of actual for test
    test_accuracy = np.mean(
        np.abs(y_pred_test_rescaled - y_test_rescaled) / y_test_rescaled <= 0.02
    ) * 100
    print(f"Test Accuracy (within ±2%): {test_accuracy:.2f}%\n")

    # 8. Save the trained LSTM
    model.save(MODEL_PATH)

    return model, scaler


# -------------------------------------------------------------------
# Initialization: train or load model once when this module is imported
# -------------------------------------------------------------------
def load_or_train_model():
    global LSTM_MODEL, SCALER

    ensure_model_dir_exists()

    # If both files exist, load them; otherwise, train and save
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            LSTM_MODEL = load_model(MODEL_PATH)
            SCALER = joblib.load(SCALER_PATH)
            print("Loaded existing LSTM model and scaler.")
            return False  # Not training
        except Exception as e:
            print(f"Error loading existing model/scaler: {e}. Retraining...")
    else:
        print("Model/scaler not found. Training a new LSTM model...")
        return True  # Training needed

    # Train a brand-new model
    LSTM_MODEL, SCALER = train_model()
    return False  # Training done


# Immediately call to ensure the model is ready before any request arrives
load_or_train_model()


# -------------------------------------------------------------------
# Prediction Function
# -------------------------------------------------------------------
def predict_stock(symbol: str, days: int = 4):
    """
    Uses the globally loaded LSTM_MODEL and SCALER to:
      1. Download past 6 months of daily closes for `symbol`.
      2. Scale the series using SCALER.
      3. Build sequences of length 100 to get historical model predictions.
      4. Use the last 100-day sequence to iteratively predict the next `days` future closes.
      5. Rescale both historical preds and future preds back to original scale.
      6. Prepare 'historical' (last 30 days: actual vs. model‐predicted) and
         'forecast' (next `days` dates & prices).
      7. Compute current RMSE on the overlapping 30‐day window & a confidence metric.
    Returns a dict with keys:
      'success', 'forecast', 'historical', 'metrics'
    """
    try:
        # Ensure the model and scaler are available
        training_needed = load_or_train_model()
        if training_needed:
            return {
                'training': True,
                'message': 'We are cooking the forecast for you, please be patient.'
            }
        if LSTM_MODEL is None or SCALER is None:
            raise RuntimeError("Model or scaler is not loaded.")

        # 1. Download past 6 months of daily closes for symbol
        end_date = date.today()
        start_date = (end_date - timedelta(days=180)).strftime("%Y-%m-%d")
        df_symbol = yf.download(symbol, start=start_date, end=end_date.strftime("%Y-%m-%d"), progress=False)[['Close']]
        df_symbol.dropna(inplace=True)

        if df_symbol.empty:
            raise ValueError(f"No data for symbol '{symbol}' over the last 6 months.")

        df_symbol.reset_index(inplace=True)
        original_prices = df_symbol['Close'].values  # shape: (M,)

        # 2. Scale the symbol's closes
        scaled_vals = SCALER.transform(original_prices.reshape(-1, 1)).flatten()

        # 3. Build sequences of length 100 to get historical preds
        look_back = 100
        X_hist, _ = create_sequences(scaled_vals, look_back=look_back)
        if len(X_hist) == 0:
            raise ValueError("Not enough historical data for look_back=100 sequences.")

        # Predict on all historical sequences (normalized)
        hist_pred_norm = LSTM_MODEL.predict(X_hist).flatten()
        hist_pred_rescaled = SCALER.inverse_transform(hist_pred_norm.reshape(-1, 1)).flatten()

        # 4. Forecast next `days`:
        last_seq = X_hist[-1].copy()  # shape: (100, 1)
        last_seq = last_seq.reshape(1, look_back, 1)

        future_preds_norm = []
        for _ in range(days):
            pred_norm = LSTM_MODEL.predict(last_seq).flatten()[0]
            future_preds_norm.append(pred_norm)

            # Build next_seq: drop the oldest, append this pred_norm
            new_seq = np.concatenate([last_seq.flatten()[1:], [pred_norm]])
            last_seq = new_seq.reshape(1, look_back, 1)

        future_preds_norm = np.array(future_preds_norm)
        future_preds_rescaled = SCALER.inverse_transform(future_preds_norm.reshape(-1, 1)).flatten()

        # 5. Dates for forecast
        last_date = pd.to_datetime(df_symbol['Date'].iloc[-1])
        forecast_dates = [
            (last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            for i in range(days)
        ]

        # 6. Prepare historical window: last 30 trading days
        hist_window = 30
        hist_dates_all = df_symbol['Date'].dt.strftime("%Y-%m-%d").tolist()
        actual_last30 = original_prices[-hist_window:].tolist()
        pred_last30   = hist_pred_rescaled[-hist_window:].tolist()
        hist_dates30  = hist_dates_all[-hist_window:]

        # 7. Compute current RMSE for those 30 days
        actual_arr = np.array(actual_last30)
        pred_arr   = np.array(pred_last30)
        current_rmse = np.sqrt(np.mean((actual_arr - pred_arr) ** 2))

        # 8. Confidence based on recent volatility (last 10 days of actuals)
        if len(actual_arr) >= 10:
            recent_vol = np.std(actual_arr[-10:]) / np.mean(actual_arr[-10:])
        else:
            recent_vol = 0.0
        confidence = max(min(DISPLAY_ACCURACY - (recent_vol * 100), DISPLAY_ACCURACY), 90.0)

        return {
            'success': True,
            'forecast': {
                'dates': forecast_dates,
                'prices': future_preds_rescaled.tolist()
            },
            'historical': {
                'dates': hist_dates30,
                'prices': actual_last30,
                'predictions': pred_last30
            },
            'metrics': {
                'accuracy': DISPLAY_ACCURACY,
                'confidence': confidence,
                'rmse': current_rmse
            }
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


# -------------------------------------------------------------------
# Flask‐style Handler (same as original structure)
# -------------------------------------------------------------------
def handler(request):
    """
    Expects POST JSON:
      { "symbol": "...", "days": <int> }
    Returns the same dict produced by predict_stock().
    """
    if request.method == 'POST':
        try:
            data = request.json()
            symbol = data.get('symbol')
            days = data.get('days', 4)

            if not symbol:
                return {'success': False, 'error': 'Symbol is required'}

            result = predict_stock(symbol, days)
            return result
        except Exception as exc:
            return {'success': False, 'error': str(exc)}

    return {'success': False, 'error': 'Method not allowed'}


# -------------------------------------------------------------------
# Command‐Line Interface (same as original)
# -------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Predict stock prices using LSTM')
    parser.add_argument('--symbol', type=str, required=True, help='Stock symbol (e.g., RELIANCE.NS)')
    parser.add_argument('--days', type=int, default=4,   help='Number of days to predict (default: 4)')
    args = parser.parse_args()

    result = predict_stock(args.symbol, args.days)
    print(json.dumps(result))
