import unittest
from . import ml


class SmartCategorisationTests(unittest.TestCase):
    def test_known_merchants_use_built_in_knowledge(self):
        for title, expected in [("Swiggy dinner", "FOOD"), ("Uber ride to office", "TRAVEL"), ("Netflix", "ENTERTAINMENT"),
                                ("Airtel recharge", "BILLS"), ("Apollo pharmacy", "HEALTH"), ("Zerodha SIP", "INVEST"), ("Monthly salary", "SALARY")]:
            with self.subTest(title=title):
                self.assertEqual(ml.suggest(title, [])["category"], expected)

    def test_gibberish_gives_no_suggestion(self):
        self.assertIsNone(ml.suggest("qwxzv plmkj", []))
        self.assertIsNone(ml.suggest("", []))

    def test_learns_from_user_history(self):
        history = [("Chaitanya mess", "FOOD")] * 4
        self.assertEqual(ml.suggest("chaitanya mess", history)["category"], "FOOD")
        history = [("Raju stores", "HOME")] * 5
        self.assertEqual(ml.suggest("Raju stores", history)["category"], "HOME")

    def test_prefix_feature_handles_variants(self):
        self.assertEqual(ml.suggest("swiggys order", [])["category"], "FOOD")

    def test_salary_is_income(self):
        self.assertEqual(ml.suggest("Freelance payout", [])["type"], "INCOME")

    def test_response_shape_and_evidence(self):
        r = ml.suggest("Swiggy dinner", [])
        self.assertTrue(0 < r["confidence"] <= 1)
        self.assertIn("swiggy", r["evidence"])
        self.assertLessEqual(len(r["alternatives"]), 2)

    def test_leave_one_out_accuracy(self):
        self.assertIsNone(ml.loo_accuracy([("Swiggy", "FOOD")] * 3))
        rows = [("Swiggy dinner", "FOOD"), ("Zomato lunch", "FOOD"), ("Uber ride", "TRAVEL"), ("Ola cab", "TRAVEL"), ("Netflix", "ENTERTAINMENT")] * 4
        self.assertGreaterEqual(ml.loo_accuracy(rows), 0.9)

    def test_training_is_reversible(self):
        nb = ml.build([])
        before = (dict(nb.docs), nb.v)
        nb.add("temporary merchant", "HOME", sign=1)
        nb.add("temporary merchant", "HOME", sign=-1)
        self.assertEqual(nb.v, before[1])


if __name__ == "__main__":
    unittest.main()
