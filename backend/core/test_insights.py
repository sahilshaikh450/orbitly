import unittest
from datetime import date, timedelta
from . import ml


def row(i, title, cat, amount, d):
    return {"id": i, "title": title, "category": cat, "amount": amount, "date": d}


class UnusualSpendTests(unittest.TestCase):
    def history(self):
        base = date(2026, 9, 1)
        return [row(i, "Lunch", "FOOD", 150 + (i % 5) * 20, base + timedelta(days=i)) for i in range(12)]

    def test_large_outlier_is_flagged_and_normal_is_not(self):
        rows = self.history() + [row(100, "Wedding dinner", "FOOD", 2500, date(2026, 10, 3))]
        flagged = {a["id"] for a in ml.insights(rows, date(2026, 10, 10))["anomalies"]}
        self.assertEqual(flagged, {100})

    def test_needs_enough_history(self):
        rows = [row(i, "Lunch", "FOOD", 150, date(2026, 10, i + 1)) for i in range(3)] + [row(9, "Big", "FOOD", 5000, date(2026, 10, 5))]
        self.assertEqual(ml.insights(rows, date(2026, 10, 10))["anomalies"], [])

    def test_check_amount(self):
        rows = self.history()
        self.assertTrue(ml.check_amount("FOOD", 3000, rows)["unusual"])
        self.assertFalse(ml.check_amount("FOOD", 200, rows)["unusual"])
        self.assertFalse(ml.check_amount("TRAVEL", 9000, rows)["enough"])


class ForecastTests(unittest.TestCase):
    def test_steady_daily_spending(self):
        rows = [row(i, "Food", "FOOD", 100, date(2026, 10, i + 1)) for i in range(10)]
        f = ml.insights(rows, date(2026, 10, 10))["forecast"]
        self.assertEqual(f["spent"], 1000)
        self.assertAlmostEqual(f["projected"], 3100, delta=1)           # 1000 + 100 * 21 days left
        self.assertLessEqual(f["low"], f["projected"])
        self.assertGreaterEqual(f["high"], f["projected"])
        self.assertEqual(len(f["series"]["actual"]), 10)
        self.assertEqual(len(f["series"]["projected"]), 22)

    def test_rent_is_not_extrapolated_every_day(self):
        rows = [row(1, "Rent", "HOME", 12000, date(2026, 10, 2))]
        rows += [row(10 + i, "Food", "FOOD", 100, date(2026, 10, i + 1)) for i in range(10)]
        f = ml.insights(rows, date(2026, 10, 10))["forecast"]
        self.assertAlmostEqual(f["projected"], 12000 + 1000 + 2100, delta=1)  # rent counted once
        self.assertEqual(f["breakdown"]["upcoming_bills"], 0)

    def test_expected_bills_come_from_previous_months(self):
        rows = [row(i, "Rent", "HOME", 12000, date(2026, m, 2)) for i, m in enumerate((7, 8, 9))]
        rows += [row(50 + i, "Food", "FOOD", 100, date(2026, 10, i + 1)) for i in range(10)]
        f = ml.insights(rows, date(2026, 10, 10))["forecast"]
        self.assertEqual(f["breakdown"]["upcoming_bills"], 12000)     # rent not paid yet this month
        self.assertAlmostEqual(f["projected"], 1000 + 2100 + 12000, delta=1)

    def test_empty_month_does_not_crash(self):
        f = ml.insights([], date(2026, 10, 1))["forecast"]
        self.assertEqual(f["projected"], 0)
        self.assertIsNone(f["vs_last_month_pct"])


if __name__ == "__main__":
    unittest.main()
