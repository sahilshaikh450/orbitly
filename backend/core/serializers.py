from datetime import date, timedelta
from rest_framework import serializers
from .models import Habit, Expense, Todo, Goal, Split, Budget, Recurring

S = lambda s: set(s.split())
EXP_CATS = S("FOOD HOME BILLS TRAVEL SHOPPING ENTERTAINMENT HEALTH INVEST SALARY OTHER")

class Checked:
    CHOICES = {}; POSITIVE = (); NONNEG = ()
    def validate(self, a):
        for f, ok in self.CHOICES.items():
            if f in a and a[f] not in ok: raise serializers.ValidationError({f: f"Must be one of: {', '.join(sorted(ok))}"})
        for f in self.POSITIVE:
            if f in a and a[f] <= 0: raise serializers.ValidationError({f: "Must be greater than 0"})
        for f in self.NONNEG:
            if f in a and a[f] < 0: raise serializers.ValidationError({f: "Cannot be negative"})
        return super().validate(a)

class Base(Checked, serializers.ModelSerializer):
    class Meta: fields = "__all__"; read_only_fields = ["user"]

def make(model, choices=None, positive=()):
    class M(Base.Meta): pass
    M.model = model
    return type(model.__name__ + "Serializer", (Base,), {"Meta": M, "CHOICES": choices or {}, "POSITIVE": positive})

class HabitSerializer(Checked, serializers.ModelSerializer):
    CHOICES = {"frequency": S("DAILY WEEKLY MONTHLY"), "category": S("HEALTH FITNESS MINDFULNESS LEARNING PRODUCTIVITY SOCIAL FINANCE CREATIVITY OTHER")}
    streak = serializers.SerializerMethodField()
    done_today = serializers.SerializerMethodField()
    week = serializers.SerializerMethodField()
    logs = serializers.SerializerMethodField()
    frozen = serializers.SerializerMethodField()
    best = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    rate30 = serializers.SerializerMethodField()
    class Meta:
        model = Habit; fields = "__all__"; read_only_fields = ["user"]
    def validate_weekly_target(self, v):
        if not 1 <= v <= 7: raise serializers.ValidationError("Weekly target must be between 1 and 7")
        return v
    def _sets(self, o):
        c = getattr(o, "_sets_cache", None)
        if c is None:
            rows = list(o.logs.values_list("date", "frozen")); c = ({d for d, f in rows if not f}, {d for d, f in rows if f}); o._sets_cache = c
        return c
    def _calc(self, o):
        done, frz = self._sets(o); every = done | frz; t = date.today()
        d = t if t in done else t - timedelta(days=1); n = 0
        while d in every:
            if d in done: n += 1
            d -= timedelta(days=1)
        best = cur = 0; prev = None
        for d in sorted(every):
            cur = cur + (1 if d in done else 0) if prev and (d - prev).days == 1 else (1 if d in done else 0)
            best = max(best, cur); prev = d
        return n, best
    def get_streak(self, o): return self._calc(o)[0]
    def get_best(self, o): return self._calc(o)[1]
    def get_done_today(self, o): return date.today() in self._sets(o)[0]
    def get_week(self, o):
        done = self._sets(o)[0]; t = date.today(); return [(t - timedelta(days=6 - i)) in done for i in range(7)]
    def get_logs(self, o): lim = date.today() - timedelta(days=125); return sorted(str(d) for d in self._sets(o)[0] if d >= lim)
    def get_frozen(self, o): lim = date.today() - timedelta(days=125); return sorted(str(d) for d in self._sets(o)[1] if d >= lim)
    def get_total(self, o): return len(self._sets(o)[0])
    def get_rate30(self, o): lim = date.today() - timedelta(days=29); return round(sum(1 for d in self._sets(o)[0] if d >= lim) * 100 / 30)

class TodoSerializer(Checked, serializers.ModelSerializer):
    CHOICES = {"priority": S("LOW MEDIUM HIGH URGENT"), "status": S("TODO IN_PROGRESS DONE"), "repeat": S("NONE DAILY WEEKLY MONTHLY")}
    class Meta:
        model = Todo; fields = "__all__"; read_only_fields = ["user", "focus_minutes"]
    def validate_subtasks(self, v):
        if not isinstance(v, list) or len(v) > 50: raise serializers.ValidationError("Up to 50 subtasks are allowed")
        return [{"t": str(x.get("t", "")).strip()[:200], "done": bool(x.get("done"))} for x in v if isinstance(x, dict) and str(x.get("t", "")).strip()]

class SplitSerializer(Checked, serializers.ModelSerializer):
    POSITIVE = ("total",)
    class Meta:
        model = Split; fields = "__all__"; read_only_fields = ["user"]
    def validate_members(self, v):
        if not isinstance(v, list) or not 2 <= len(v) <= 20: raise serializers.ValidationError("A split needs 2 to 20 people")
        out = [{"name": str(m.get("name", "")).strip()[:40], "settled": bool(m.get("settled"))} for m in v if isinstance(m, dict)]
        if len(out) != len(v) or any(not m["name"] for m in out): raise serializers.ValidationError("Every person needs a name")
        return out

ExpenseSerializer = make(Expense, {"type": S("EXPENSE INCOME"), "category": EXP_CATS, "payment_method": S("UPI CARD CASH BANK")}, ("amount",))
GoalSerializer = make(Goal, {"kind": S("SAVING EMERGENCY")}, ("target",))
BudgetSerializer = make(Budget, {"category": EXP_CATS}, ("limit",))
RecurringSerializer = make(Recurring, {"type": S("EXPENSE INCOME"), "category": EXP_CATS, "payment_method": S("UPI CARD CASH BANK"), "frequency": S("WEEKLY MONTHLY YEARLY")}, ("amount",))

from .models import Journal
class JournalSerializer(Base):
    class Meta:
        model = Journal; fields = "__all__"; read_only_fields = ["user"]
    def validate_mood(self, v):
        if not 1 <= v <= 5: raise serializers.ValidationError("Mood must be between 1 and 5")
        return v
    def validate_text(self, v):
        if len(v) > 5000: raise serializers.ValidationError("Entries can be up to 5000 characters")
        return v
    def validate_date(self, v):
        if v > date.today(): raise serializers.ValidationError("Date cannot be in the future")
        return v

from .models import Account
class AccountSerializer(Checked, serializers.ModelSerializer):
    CHOICES = {"kind": S("CASH BANK WALLET INVESTMENT CREDIT LOAN")}; NONNEG = ("balance",)
    class Meta:
        model = Account; fields = "__all__"; read_only_fields = ["user", "history"]
