import yfinance as yf
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.arima.model import ARIMA
from keras.models import Sequential, load_model
from keras.layers import LSTM, Dense, Dropout
from keras.regularizers import l2
import os
import joblib
from datetime import datetime, timedelta

MODEL_PATH = 'models/hybrid_model'
SCALER_PATH = 'models/scaler.pkl'

def create_lstm_dataset(data, look_back=60):
    X, y = [], []
    for i in range(len(data) - look_back):
        X.append(data[i:i + look_back])
        y.append(data[i + look_back])
    return np.array(X), np.array(y)

def train_model():
    # Training data preparation
    tickers = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"]
    all_stock_data = []
    
    for ticker in tickers:
        try:
            stock_data = yf.download(ticker, period="6mo", interval="1d")[['Close']]
            stock_data.dropna(inplace=True)
            scaler = MinMaxScaler(feature_range=(0, 1))
            scaled_data = scaler.fit_transform(stock_data)
            all_stock_data.append(scaled_data)
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            continue

    # Save scaler for future use
    if not os.path.exists('models'):
        os.makedirs('models')
    joblib.dump(scaler, SCALER_PATH)

    combined_stock_data = np.concatenate(all_stock_data).ravel()
    train_data = combined_stock_data

    # Train ARIMA model
    arima_model = ARIMA(train_data, order=(5, 1, 0))
    arima_fitted = arima_model.fit()

    # Prepare LSTM data
    look_back = 10
    trainX, trainY = create_lstm_dataset(train_data, look_back)
    trainX = np.reshape(trainX, (trainX.shape[0], trainX.shape[1], 1))

    # Train LSTM model
    lstm_model = Sequential([
        LSTM(50, return_sequences=True, input_shape=(trainX.shape[1], 1), kernel_regularizer=l2(0.001)),
        LSTM(50, return_sequences=False, kernel_regularizer=l2(0.001)),
        Dropout(0.2),
        Dense(25),
        Dense(1)
    ])
    
    lstm_model.compile(optimizer='adam', loss='mean_squared_error')
    lstm_model.fit(trainX, trainY, epochs=100, batch_size=5, verbose=1)

    # Save models
    lstm_model.save(f"{MODEL_PATH}_lstm")
    arima_fitted.save(f"{MODEL_PATH}_arima.pkl")

    return lstm_model, arima_fitted, scaler

def predict_stock(symbol: str, days: int = 4):
    try:
        # Load or train models
        if not os.path.exists(f"{MODEL_PATH}_lstm"):
            lstm_model, arima_model, scaler = train_model()
        else:
            lstm_model = load_model(f"{MODEL_PATH}_lstm")
            arima_model = joblib.load(f"{MODEL_PATH}_arima.pkl")
            scaler = joblib.load(SCALER_PATH)

        # Fetch recent data
        stock_data = yf.download(symbol, period="6mo", interval="1d")[['Close']]
        stock_data.dropna(inplace=True)
        
        # Scale data
        scaled_data = scaler.transform(stock_data)

        # Generate ARIMA forecast
        arima_forecast = arima_model.forecast(steps=days)
        arima_forecast = np.array(arima_forecast).reshape(-1, 1)

        # Prepare LSTM input
        look_back = 10
        last_sequence = scaled_data[-look_back:].reshape(1, look_back, 1)
        
        # Generate LSTM forecast
        lstm_forecast = []
        current_sequence = last_sequence.copy()
        
        for _ in range(days):
            next_pred = lstm_model.predict(current_sequence)[0]
            lstm_forecast.append(next_pred)
            current_sequence = np.roll(current_sequence, -1, axis=1)
            current_sequence[0, -1, 0] = next_pred

        lstm_forecast = np.array(lstm_forecast).reshape(-1, 1)

        # Combine forecasts
        final_forecast = arima_forecast + lstm_forecast

        # Scale back to original range
        final_forecast_rescaled = scaler.inverse_transform(final_forecast)

        # Prepare dates for forecast
        last_date = stock_data.index[-1]
        forecast_dates = [(last_date + timedelta(days=i+1)).strftime('%Y-%m-%d') 
                         for i in range(days)]

        # Prepare historical data for plotting
        historical_dates = stock_data.index[-30:].strftime('%Y-%m-%d').tolist()
        historical_prices = stock_data['Close'].values[-30:].tolist()

        return {
            'success': True,
            'forecast': {
                'dates': forecast_dates,
                'prices': final_forecast_rescaled.flatten().tolist()
            },
            'historical': {
                'dates': historical_dates,
                'prices': historical_prices
            }
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def handler(request):
    if request.method == 'POST':
        try:
            data = request.json()
            symbol = data.get('symbol')
            if not symbol:
                return {'success': False, 'error': 'Symbol is required'}
            
            result = predict_stock(symbol)
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    return {'success': False, 'error': 'Method not allowed'} 