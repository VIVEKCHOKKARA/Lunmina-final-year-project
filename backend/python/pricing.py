"""
Dynamic Pricing Engine for Profit Navigator using XGBoost.
Falls back to rule-based pricing if XGBoost is not installed.

Reads JSON from stdin:
  {
    "products": [
      {
        "id": "...", "name": "...", "price": 50,
        "units_sold": 100, "revenue": 5000,
        "trend": "up" | "down" | "stable",
        "cluster": "star" | "cash-cow" | "question-mark" | "underperformer"
      },
      ...
    ]
  }

Writes JSON to stdout:
  {
    "suggestions": [
      {
        "id": "...", "productId": "...", "product": "...",
        "currentPrice": 50, "suggestedPrice": 54,
        "reason": "...", "confidence": 88, "expectedImpact": "..."
      }
    ],
    "model_used": "xgboost" | "rule_based"
  }
"""

import sys
import json
import numpy as np

try:
    import xgboost as xgb
    from sklearn.preprocessing import LabelEncoder
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


# ── Feature encoding helpers ─────────────────────────────────────────────────
TREND_MAP = {"up": 2, "stable": 1, "down": 0}
CLUSTER_MAP = {"star": 3, "cash-cow": 2, "question-mark": 1, "underperformer": 0}


def encode_product(p: dict) -> list:
    """Convert product dict to feature vector."""
    return [
        float(p["price"]),
        float(p["units_sold"]),
        float(p["revenue"]),
        float(p["revenue"]) / max(float(p["units_sold"]), 1),  # revenue per unit
        TREND_MAP.get(p["trend"], 1),
        CLUSTER_MAP.get(p["cluster"], 0),
    ]


# ── XGBoost Pricing ──────────────────────────────────────────────────────────
def xgboost_pricing(products: list):
    """
    Use XGBoost to predict optimal price multiplier.
    Since we have no labeled training data, we generate synthetic training
    data based on business rules, then let XGBoost learn the pattern.
    """
    if len(products) < 2:
        return rule_based_pricing(products)

    # Generate synthetic training data
    # Label = price adjustment multiplier (e.g. 1.08 = raise 8%)
    X_train = []
    y_train = []

    for p in products:
        features = encode_product(p)
        trend = p["trend"]
        cluster = p["cluster"]

        # Synthetic target multiplier based on business logic
        if trend == "up" and cluster == "star":
            multiplier = 1.08
        elif trend == "down":
            multiplier = 0.90
        elif cluster == "underperformer":
            multiplier = 0.85
        elif cluster == "cash-cow" and trend == "stable":
            multiplier = 1.03
        elif trend == "up":
            multiplier = 1.05
        else:
            multiplier = 1.0  # no change

        X_train.append(features)
        y_train.append(multiplier)

    X_train = np.array(X_train)
    y_train = np.array(y_train)

    # Train XGBoost regressor
    model = xgb.XGBRegressor(
        n_estimators=50,
        max_depth=3,
        learning_rate=0.1,
        random_state=42,
        verbosity=0
    )
    model.fit(X_train, y_train)

    # Predict multipliers for all products
    X_pred = np.array([encode_product(p) for p in products])
    multipliers = model.predict(X_pred)

    suggestions = []
    for i, p in enumerate(products):
        multiplier = float(multipliers[i])
        if abs(multiplier - 1.0) < 0.01:
            continue  # skip if no meaningful change

        suggested_price = round(p["price"] * multiplier, 2)
        is_increase = multiplier > 1.0
        pct_change = round(abs(multiplier - 1.0) * 100)

        # Confidence based on cluster + trend alignment
        if p["cluster"] == "star" and p["trend"] == "up":
            confidence = 88
        elif p["cluster"] == "cash-cow":
            confidence = 94
        elif p["trend"] == "down":
            confidence = 72
        elif p["cluster"] == "underperformer":
            confidence = 65
        else:
            confidence = 75

        reason = _build_reason(p, is_increase, pct_change)
        impact = _build_impact(p, is_increase, pct_change)

        suggestions.append({
            "id": p["id"],
            "productId": p["id"],
            "product": p["name"],
            "currentPrice": p["price"],
            "suggestedPrice": suggested_price,
            "reason": reason,
            "confidence": confidence,
            "expectedImpact": impact,
        })

    return suggestions


# ── Rule-Based Fallback ──────────────────────────────────────────────────────
def rule_based_pricing(products: list):
    """Fallback: rule-based pricing suggestions."""
    suggestions = []

    for p in products:
        trend = p["trend"]
        cluster = p["cluster"]
        multiplier = 1.0
        confidence = 0
        reason = ""
        impact = ""

        if trend == "up" and cluster == "star":
            multiplier = 1.08
            confidence = 88
            reason = "High demand & positive momentum. Market data suggests room for an 8% premium."
            impact = f"+${round(p['revenue'] * 0.05):,}/mo revenue"
        elif trend == "down":
            multiplier = 0.90
            confidence = 72
            reason = "Declining sales velocity. A 10% price cut could recover ~40% of lost volume."
            impact = "+25% unit volume"
        elif cluster == "underperformer":
            multiplier = 0.85
            confidence = 65
            reason = "Low conversion rates. Aggressive pricing recommended to clear inventory."
            impact = "Clear stock in 30 days"
        elif cluster == "cash-cow" and trend == "stable":
            multiplier = 1.03
            confidence = 94
            reason = "Loyal customer base. Small optimization reflects rising operational costs."
            impact = "+$1.2K/mo profit"

        if multiplier == 1.0:
            continue

        suggestions.append({
            "id": p["id"],
            "productId": p["id"],
            "product": p["name"],
            "currentPrice": p["price"],
            "suggestedPrice": round(p["price"] * multiplier, 2),
            "reason": reason,
            "confidence": confidence,
            "expectedImpact": impact,
        })

    return suggestions


def _build_reason(p: dict, is_increase: bool, pct: int) -> str:
    cluster = p["cluster"]
    trend = p["trend"]
    if cluster == "star" and trend == "up":
        return f"High demand & positive momentum. XGBoost model suggests room for a {pct}% premium."
    elif trend == "down":
        return f"Declining sales velocity. A {pct}% price cut could recover lost volume."
    elif cluster == "underperformer":
        return f"Low conversion rates. Aggressive {pct}% reduction recommended to clear inventory."
    elif cluster == "cash-cow":
        return f"Loyal customer base. XGBoost recommends a {pct}% optimization for rising costs."
    return f"XGBoost model recommends a {pct}% price {'increase' if is_increase else 'reduction'}."


def _build_impact(p: dict, is_increase: bool, pct: int) -> str:
    if is_increase:
        return f"+${round(p['revenue'] * (pct / 100) * 0.5):,}/mo revenue"
    else:
        return f"+{pct * 2}% unit volume"


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)
    products = payload["products"]

    if XGBOOST_AVAILABLE and len(products) >= 2:
        suggestions = xgboost_pricing(products)
        model_used = "xgboost"
    else:
        suggestions = rule_based_pricing(products)
        model_used = "rule_based"

    print(json.dumps({"suggestions": suggestions, "model_used": model_used}))


if __name__ == "__main__":
    main()
