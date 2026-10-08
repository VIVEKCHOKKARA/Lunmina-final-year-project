"""
Product Clustering for Profit Navigator using K-Means.
Falls back to rule-based clustering if scikit-learn fails.

Reads JSON from stdin:
  {
    "products": [
      { "id": "...", "name": "...", "units_sold": 100, "revenue": 5000, "price": 50 },
      ...
    ]
  }

Writes JSON to stdout:
  {
    "clusters": [
      { "id": "...", "cluster": "star" | "cash-cow" | "question-mark" | "underperformer" },
      ...
    ],
    "model_used": "kmeans" | "rule_based"
  }
"""

import sys
import json
import numpy as np

try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


# ── Cluster label mapping ────────────────────────────────────────────────────
def map_cluster_label(units_sold: float, revenue: float,
                       units_mean: float, revenue_mean: float) -> str:
    """Map a product to BCG-style cluster based on position relative to means."""
    high_units = units_sold >= units_mean
    high_revenue = revenue >= revenue_mean

    if high_units and high_revenue:
        return "star"
    elif not high_units and high_revenue:
        return "cash-cow"
    elif high_units and not high_revenue:
        return "question-mark"
    else:
        return "underperformer"


# ── K-Means Clustering ───────────────────────────────────────────────────────
def kmeans_cluster(products: list):
    """Cluster products using K-Means (4 clusters = BCG matrix)."""
    if len(products) < 4:
        return rule_based_cluster(products)

    ids = [p["id"] for p in products]
    units = np.array([p["units_sold"] for p in products], dtype=float)
    revenues = np.array([p["revenue"] for p in products], dtype=float)

    X = np.column_stack([units, revenues])

    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-Means with 4 clusters (Star, Cash Cow, Question Mark, Underperformer)
    n_clusters = min(4, len(products))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(X_scaled)

    # Map cluster IDs to BCG labels based on centroid positions
    centers = scaler.inverse_transform(kmeans.cluster_centers_)
    units_mean = np.mean(units)
    revenue_mean = np.mean(revenues)

    cluster_label_map = {}
    for cluster_id, center in enumerate(centers):
        cluster_label_map[cluster_id] = map_cluster_label(
            center[0], center[1], units_mean, revenue_mean
        )

    results = []
    for i, product in enumerate(products):
        cluster_id = kmeans.labels_[i]
        results.append({
            "id": product["id"],
            "cluster": cluster_label_map[cluster_id]
        })

    return results


# ── Rule-Based Fallback ──────────────────────────────────────────────────────
def rule_based_cluster(products: list):
    """Fallback: rule-based BCG clustering using median thresholds."""
    if not products:
        return []

    units_vals = [p["units_sold"] for p in products]
    revenue_vals = [p["revenue"] for p in products]

    units_median = np.median(units_vals)
    revenue_median = np.median(revenue_vals)

    results = []
    for p in products:
        cluster = map_cluster_label(
            p["units_sold"], p["revenue"], units_median, revenue_median
        )
        results.append({"id": p["id"], "cluster": cluster})

    return results


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)
    products = payload["products"]

    if SKLEARN_AVAILABLE and len(products) >= 2:
        clusters = kmeans_cluster(products)
        model_used = "kmeans"
    else:
        clusters = rule_based_cluster(products)
        model_used = "rule_based"

    print(json.dumps({"clusters": clusters, "model_used": model_used}))


if __name__ == "__main__":
    main()
