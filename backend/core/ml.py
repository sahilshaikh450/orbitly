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
