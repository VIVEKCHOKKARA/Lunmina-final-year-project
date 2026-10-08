"""
Forecasting model for Profit Navigator using Facebook Prophet.
Falls back to Linear Regression if Prophet is not installed.

Reads JSON from stdin:
  { "months": ["2024-01", ...], "revenues": [...], "expenses": [...] }

Writes JSON to stdout:
  { "forecasts": [...], "model_used": "prophet" | "linear_regression" }
"""

import sys
import json
from datetime import datetime
from dateutil.relativedelta import relativedelta

import numpy as np

# ── Try Prophet first, fall back to Linear Regression ──────────────────────
try:
    from prophet import Prophet
    import pandas as pd
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False

from sklearn.linear_model import LinearRegression


# ── Prophet Forecast ────────────────────────────────────────────────────────
def prophet_forecast(months: list, values: list, future_count: int = 6):
    """Use Facebook Prophet for time-series forecasting."""
    if len(values) < 2:
        return [max(0, round(values[0])) if values else 0] * future_count, 0.0

    df = pd.DataFrame({
        "ds": pd.to_datetime([m + "-01" for m in months]),
        "y": values
    })

    # Yearly seasonality needs at least two full cycles (>= 24 monthly points).
    # At exactly 12 points each month is its own seasonal slot, so Prophet
    # overfits a full cycle and extrapolates to wild/negative values. Keep it
    # off until we have enough history for the pattern to be real.
    yearly_seasonality = len(values) >= 24

    model = Prophet(
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="additive",
        changepoint_prior_scale=0.05,   # smoother trend for small data
        interval_width=0.80,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=future_count, freq="MS")
    forecast = model.predict(future)

    # Get only the future predictions
    future_preds = forecast.tail(future_count)["yhat"].tolist()
    future_preds = [max(0, round(float(p))) for p in future_preds]

    # R² score on historical data
    historical_pred = forecast.head(len(values))["yhat"].tolist()
    ss_res = sum((values[i] - historical_pred[i]) ** 2 for i in range(len(values)))
    y_mean = sum(values) / len(values)
    ss_tot = sum((v - y_mean) ** 2 for v in values)
    r2 = max(0.0, 1 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0

    return future_preds, round(r2, 4)


# ── Linear Regression Fallback ───────────────────────────────────────────────
def linear_regression_forecast(values: list, future_count: int = 6):
    """Fallback: simple linear regression forecast."""
    n = len(values)
    if n < 2:
        return [max(0, round(values[0])) if values else 0] * future_count, 0.0

    X = np.arange(n).reshape(-1, 1)
    y = np.array(values)

    model = LinearRegression()
    model.fit(X, y)

    r2 = float(model.score(X, y))
    future_X = np.arange(n, n + future_count).reshape(-1, 1)
    predictions = [max(0, round(float(p))) for p in model.predict(future_X)]

    return predictions, round(r2, 4)


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)

    months: list = payload["months"]
    revenues: list = payload["revenues"]
    expenses: list = payload["expenses"]
    future_count = 6

    # Choose model
    if PROPHET_AVAILABLE and len(revenues) >= 2:
        rev_preds, rev_r2 = prophet_forecast(months, revenues, future_count)
        exp_preds, _ = prophet_forecast(months, expenses, future_count)
        model_used = "prophet"
    else:
        rev_preds, rev_r2 = linear_regression_forecast(revenues, future_count)
        exp_preds, _ = linear_regression_forecast(expenses, future_count)
        model_used = "linear_regression"

    # Build forecast periods
    last_month = datetime.strptime(months[-1], "%Y-%m") if months else datetime.now().replace(day=1)

    forecasts = []
    for i in range(future_count):
        future_date = last_month + relativedelta(months=i + 1)
        period = future_date.strftime("%b %y")
        confidence = round(max(0.5, 0.95 - i * 0.05) * rev_r2, 4)

        forecasts.append({
            "period": period,
            "predicted_revenue": rev_preds[i],
            "predicted_expenses": exp_preds[i],
            "confidence": confidence,
        })

    print(json.dumps({"forecasts": forecasts, "model_used": model_used}))


if __name__ == "__main__":
    main()
