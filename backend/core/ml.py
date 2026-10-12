"""Smart expense categorisation.

A small Multinomial Naive Bayes classifier written from scratch (no external ML library).

How it works
------------
1. Tokenise the title into lowercase words and add a 4-letter prefix feature per word, so
   "swiggy", "swiggys" and "swigy" still share evidence.
2. Train on two sources: a built-in keyword list (cold start, weight 2) and the user's own past
   transactions (weight 1), so predictions get more personal as the user adds data.
3. Score every category with log P(category) + sum(log P(word | category)) using Laplace smoothing,
   turn the scores into probabilities with a softmax, and return the best category.
4. Words never seen in training are ignored, so gibberish gives "no suggestion" instead of a guess.

The model is retrained per request. That is cheap (hundreds of rows) and means there is no model
file to store or keep in sync. `loo_accuracy` estimates quality with leave-one-out validation.
"""
import math
import re
from collections import Counter, defaultdict

STOP = {"the", "an", "to", "for", "of", "and", "in", "on", "at", "by", "with", "from", "via", "upi", "txn", "ref", "no", "id"}
SEED_WEIGHT = 2.0
SEED = {
    "FOOD": "zomato swiggy dominos pizza burger kfc mcdonalds starbucks cafe coffee chai tea restaurant dhaba biryani thali breakfast lunch dinner snacks sandwich icecream bakery grocery groceries vegetables fruits milk bigbasket blinkit zepto dmart kirana food canteen mess juice",
    "TRAVEL": "uber ola rapido cab taxi auto rickshaw petrol diesel fuel cng metro bus train irctc ticket flight indigo airindia vistara hotel oyo goibibo makemytrip toll fastag parking travel trip ride",
    "SHOPPING": "amazon flipkart myntra ajio meesho nykaa shopping clothes shirt jeans shoes sneakers dress mall bag watch gadget headphones earbuds cover",
    "BILLS": "electricity water gas lpg wifi broadband internet airtel jio vodafone recharge prepaid postpaid dth tatasky dishtv insurance premium emi loan bill tax",
    "ENTERTAINMENT": "netflix prime hotstar spotify youtube subscription movie cinema pvr inox bookmyshow concert gaming game steam playstation ott party club bar pub",
    "HEALTH": "pharmacy medicine medical doctor hospital clinic apollo medplus pharmeasy lab test dentist gym fitness cult yoga checkup physiotherapy",
    "HOME": "rent landlord maintenance society furniture ikea repair plumber electrician carpenter cleaning maid cook decor appliance paint urbancompany",
    "INVEST": "sip mutual fund stocks shares zerodha groww upstox nps ppf fd rd deposit gold crypto bonds invest investment",
    "SALARY": "salary freelance stipend bonus payout income interest dividend refund cashback reimbursement commission pocket received",
}


def tokens(text):
    words = [w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(w) > 1 and w not in STOP and not w.isdigit()]
    return words + [f"~{w[:4]}" for w in words if len(w) >= 4]


class NaiveBayes:
    def __init__(self, alpha=0.5):
        self.alpha = alpha
        self.docs = Counter()                  # category -> total document weight
        self.feat = defaultdict(Counter)       # category -> feature -> weight
        self.total = Counter()                 # category -> total feature weight
        self.vocab = Counter()                 # feature -> weight over all categories
        self.v = 0                             # number of distinct features currently known

    def add(self, text, label, weight=1.0, sign=1):
        feats = tokens(text)
        if not feats:
            return
        self.docs[label] += sign * weight
        for f in feats:
            before = self.vocab[f]
            self.feat[label][f] += sign * weight
            self.total[label] += sign * weight
            self.vocab[f] += sign * weight
            if before <= 1e-9 < self.vocab[f]: self.v += 1
            elif self.vocab[f] <= 1e-9 < before: self.v -= 1

    def _logp(self, label, f):
        return math.log((self.feat[label][f] + self.alpha) / (self.total[label] + self.alpha * max(self.v, 1)))

    def predict(self, text):
        """Return (ranked [(label, probability)], known_features) or None when nothing is recognised."""
        feats = [f for f in tokens(text) if self.vocab[f] > 1e-9]
        labels = [c for c in self.docs if self.docs[c] > 1e-9]
        if not feats or not labels:
            return None
        z = sum(self.docs[c] for c in labels)
        scores = {c: math.log(self.docs[c] / z) + sum(self._logp(c, f) for f in feats) for c in labels}
        m = max(scores.values())
        e = {c: math.exp(s - m) for c, s in scores.items()}
        s = sum(e.values())
        return sorted(((c, v / s) for c, v in e.items()), key=lambda x: -x[1]), feats

    def explain(self, feats, top, other, limit=3):
        """Words that push the prediction towards `top` and away from the runner-up."""
        if other is None:
            return []
        gains = sorted(((self._logp(top, f) - self._logp(other, f), f) for f in set(feats) if not f.startswith("~")), reverse=True)
        return [f for gain, f in gains[:limit] if gain > 0]


def build(rows):
    """rows: iterable of (title, category) from the user's history."""
    nb = NaiveBayes()
    for cat, words in SEED.items():
        for w in words.split():
            nb.add(w, cat, SEED_WEIGHT)
    for title, cat in rows:
        nb.add(title, cat, 1.0)
    return nb


def suggest(title, rows):
    nb = build(rows)
    res = nb.predict(title)
    if not res:
        return None
    ranked, feats = res
    top, p = ranked[0]
    return {
        "category": top, "type": "INCOME" if top == "SALARY" else "EXPENSE", "confidence": round(p, 3),
        "alternatives": [{"category": c, "p": round(q, 3)} for c, q in ranked[1:3] if q >= 0.03],
        "evidence": nb.explain(feats, top, ranked[1][0] if len(ranked) > 1 else None),
    }


def loo_accuracy(rows, cap=300):
    """Leave-one-out accuracy on the user's own data (None when there is too little data)."""
    rows = list(rows)[-cap:]
    if len(rows) < 10:
        return None
    nb = build(rows)
    hit = seen = 0
    for title, cat in rows:
        nb.add(title, cat, sign=-1)
        res = nb.predict(title)
        nb.add(title, cat)
        if res:
            seen += 1
            hit += res[0][0][0] == cat
    return round(hit / seen, 3) if seen else None


# ---------------------------------------------------------------------------------------------
# Spending forecast and unusual-spend detection
# ---------------------------------------------------------------------------------------------
import calendar
import statistics
from datetime import date, timedelta

LUMPY = {"HOME", "BILLS", "INVEST"}   # rent, bills, SIPs: big, rare, not extrapolated day by day
MIN_SAMPLES = 5
MIN_RATIO = 2.0                        # must be at least twice the category median
Z_LIMIT = 3.5                          # modified z-score limit (Iglewicz & Hoaglin)


def category_stats(rows):
    """Median and MAD (median absolute deviation) of expense amounts per category."""
    by = defaultdict(list)
    for r in rows:
        by[r["category"]].append(float(r["amount"]))
    out = {}
    for cat, xs in by.items():
        if len(xs) >= MIN_SAMPLES:
            med = statistics.median(xs)
            out[cat] = (med, statistics.median(abs(x - med) for x in xs))
    return out


def unusual(amount, stat):
    """Return (is_unusual, ratio_to_median). Robust to outliers because it uses median and MAD, not mean and std."""
    med, mad = stat
    ratio = amount / med if med else 0
    if ratio < MIN_RATIO:
        return False, ratio
    z = 0.6745 * (amount - med) / mad if mad else float("inf")
    return z > Z_LIMIT, ratio


def check_amount(category, amount, rows):
    stat = category_stats(rows).get(category)
    if not stat:
        return {"enough": False, "unusual": False, "median": None, "ratio": None}
    flag, ratio = unusual(float(amount), stat)
    return {"enough": True, "unusual": flag, "median": round(stat[0], 2), "ratio": round(ratio, 1)}


def _month_shift(d, n):
    m = d.month - 1 + n
    return date(d.year + m // 12, m % 12 + 1, 1)


def insights(rows, today=None, window_days=90):
    """rows: expense dicts with id, title, category, amount, date. Returns {"forecast": ..., "anomalies": [...]}."""
    today = today or date.today()
    rows = [dict(r, amount=float(r["amount"])) for r in rows if r["date"] <= today]
    stats = category_stats(rows)

    flagged, anomalies = set(), []
    for r in rows:
        stat = stats.get(r["category"])
        if stat:
            flag, ratio = unusual(r["amount"], stat)
            if flag:
                flagged.add(r["id"])
                if r["date"] >= today - timedelta(days=window_days):
                    anomalies.append({"id": r["id"], "title": r["title"], "category": r["category"], "amount": r["amount"],
                                      "date": str(r["date"]), "ratio": round(ratio, 1), "usual": round(stat[0], 2)})
    anomalies.sort(key=lambda a: (a["date"], a["ratio"]), reverse=True)

    dim = calendar.monthrange(today.year, today.month)[1]
    first = today.replace(day=1)
    this_month = [r for r in rows if r["date"] >= first]
    spent = sum(r["amount"] for r in this_month)
    lumpy_spent = sum(r["amount"] for r in this_month if r["category"] in LUMPY)

    # daily series of ordinary (non-lumpy, non-anomalous) spending
    base = [0.0] * today.day
    for r in this_month:
        if r["category"] not in LUMPY and r["id"] not in flagged:
            base[r["date"].day - 1] += r["amount"]
    mean_all = sum(base) / len(base)
    last7 = base[-7:]
    rate = mean_all if today.day < 10 else 0.5 * mean_all + 0.5 * (sum(last7) / len(last7))
    if today.day < 3:  # too early to trust this month: lean on last month
        prev = _month_shift(first, -1)
        pdim = calendar.monthrange(prev.year, prev.month)[1]
        prev_ord = sum(r["amount"] for r in rows if prev <= r["date"] < first and r["category"] not in LUMPY and r["id"] not in flagged)
        rate = prev_ord / pdim if prev_ord else rate

    # expected bills: average lumpy total of the previous (up to) 3 months
    totals = []
    for k in (-1, -2, -3):
        a, b = _month_shift(first, k), _month_shift(first, k + 1)
        t = sum(r["amount"] for r in rows if a <= r["date"] < b and r["category"] in LUMPY)
        if t:
            totals.append(t)
    expected_lumpy = sum(totals) / len(totals) if totals else lumpy_spent
    upcoming = max(0.0, expected_lumpy - lumpy_spent)

    days_left = dim - today.day
    daily_part = rate * days_left
    projected = spent + daily_part + upcoming
    std = statistics.stdev(base) if len(base) > 2 else 0.0
    band = 1.28 * std * math.sqrt(days_left)              # roughly an 80% interval for the daily part
    prev_month = [r["amount"] for r in rows if _month_shift(first, -1) <= r["date"] < first]
    last_total = sum(prev_month)

    cum, actual = 0.0, []
    for i in range(today.day):
        cum += sum(r["amount"] for r in this_month if r["date"].day == i + 1)
        actual.append(round(cum, 2))
    path = [round(spent + rate * i + (upcoming * i / days_left if days_left else 0), 2) for i in range(days_left + 1)]
    return {
        "forecast": {
            "day": today.day, "days_in_month": dim, "spent": round(spent, 2), "projected": round(projected, 2),
            "low": round(max(spent, projected - band), 2), "high": round(projected + band, 2), "daily_rate": round(rate, 2), "days_left": days_left,
            "breakdown": {"so_far": round(spent, 2), "daily_spending": round(daily_part, 2), "upcoming_bills": round(upcoming, 2)},
            "last_month": round(last_total, 2), "vs_last_month_pct": round((projected - last_total) * 100 / last_total, 1) if last_total else None,
            "series": {"actual": actual, "projected": path},
        },
        "anomalies": anomalies[:5],
    }
