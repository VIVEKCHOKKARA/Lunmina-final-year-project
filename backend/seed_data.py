"""
Seed realistic transaction history so the dashboard charts have data:
  - Revenue & Profit Trend (monthly income vs expense)
  - Growth Analysis & Forecasting (daily sales + projection)
  - Sales Forecasting page (monthly Prophet/linear forecast)

Generates ~12 months of daily sales (income) with weekday/weekend and seasonal
patterns plus recurring business expenses (rent, payroll, supplies, utilities).

Run:  python backend/seed_data.py            (clears + reseeds transactions)
      python backend/seed_data.py --keep     (append without clearing)
"""
import os
import sys
import random
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))
import db  # noqa: E402

random.seed(42)

DAYS = 365
TODAY = date.today()
START = TODAY - timedelta(days=DAYS)

SALES_DESCRIPTIONS = [
    "Counter sales", "Online order", "Catering order", "Walk-in sales",
    "Card payment batch", "Mobile app order",
]
EXPENSE_PLAN = {
    "Rent": (1, 3500),         # 1st of month
    "Utilities": (5, 600),      # 5th of month
}


def daily_income_total(d: date, idx: int) -> float:
    base = 1500
    trend = 1 + 0.0008 * idx                 # gentle year-long growth
    weekend = 1.35 if d.weekday() >= 5 else 1.0
    december = 1.25 if d.month == 12 else 1.0
    noise = random.uniform(0.85, 1.15)
    return round(base * trend * weekend * december * noise, 2)


def build_rows():
    rows = []  # (date, description, category, amount, type)

    # ── Daily sales (income), split into a few realistic "orders" ────────────
    for idx in range(DAYS + 1):
        d = START + timedelta(days=idx)
        total = daily_income_total(d, idx)
        n_orders = random.randint(3, 6)
        # Split the day's total across n orders.
        cuts = sorted(random.uniform(0, 1) for _ in range(n_orders - 1))
        bounds = [0.0, *cuts, 1.0]
        for j in range(n_orders):
            amt = round(total * (bounds[j + 1] - bounds[j]), 2)
            if amt <= 0:
                continue
            rows.append((d.isoformat(), random.choice(SALES_DESCRIPTIONS),
                         "Sales", amt, "income"))

    # ── Recurring monthly expenses ───────────────────────────────────────────
    cur = date(START.year, START.month, 1)
    while cur <= TODAY:
        for label, (day, amount) in EXPENSE_PLAN.items():
            try:
                ed = cur.replace(day=day)
            except ValueError:
                continue
            if START <= ed <= TODAY:
                jitter = round(amount * random.uniform(0.97, 1.03), 2)
                rows.append((ed.isoformat(), f"{label} — monthly", label, jitter, "expense"))
        # Payroll on the 1st and 15th
        for pay_day in (1, 15):
            try:
                pd = cur.replace(day=pay_day)
            except ValueError:
                continue
            if START <= pd <= TODAY:
                rows.append((pd.isoformat(), "Staff payroll", "Payroll", 4000.00, "expense"))
        # advance one month
        cur = (cur.replace(day=28) + timedelta(days=7)).replace(day=1)

    # ── Weekly supply purchases (every Monday) + occasional equipment ────────
    d = START
    while d <= TODAY:
        if d.weekday() == 0:  # Monday
            rows.append((d.isoformat(), "Inventory restock", "Supplies",
                         round(random.uniform(650, 950), 2), "expense"))
        d += timedelta(days=1)
    # A couple of one-off equipment expenses (creates a realistic anomaly)
    rows.append(((START + timedelta(days=210)).isoformat(),
                 "New espresso machine", "Equipment", 8200.00, "expense"))
    rows.append(((START + timedelta(days=300)).isoformat(),
                 "POS system upgrade", "Equipment", 2400.00, "expense"))

    return rows


def main():
    keep = "--keep" in sys.argv
    rows = build_rows()

    if not keep:
        db.execute("DELETE FROM transactions")
        print("Cleared existing transactions.")

    db.execute_many(
        "INSERT INTO transactions (date, description, category, amount, type) "
        "VALUES (%s, %s, %s, %s, %s)",
        rows,
    )

    income = sum(r[3] for r in rows if r[4] == "income")
    expense = sum(r[3] for r in rows if r[4] == "expense")
    print(f"Inserted {len(rows)} transactions "
          f"({sum(1 for r in rows if r[4]=='income')} income / "
          f"{sum(1 for r in rows if r[4]=='expense')} expense)")
    print(f"  Date range : {START} -> {TODAY}")
    print(f"  Revenue    : ${income:,.2f}")
    print(f"  Expenses   : ${expense:,.2f}")
    print(f"  Net profit : ${income - expense:,.2f}")


if __name__ == "__main__":
    main()
