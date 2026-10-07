from datetime import date, timedelta
from rest_framework import serializers
from .models import Habit, Expense, Todo, Goal, Split, Budget, Recurring

S = lambda s: set(s.split())
EXP_CATS = S("FOOD HOME BILLS TRAVEL SHOPPING ENTERTAINMENT HEALTH INVEST SALARY OTHER")

class Checked:
    CHOICES = {}; POSITIVE = ()
    def validate(self, a):
        for f, ok in self.CHOICES.items():
            if f in a and a[f] not in ok: raise serializers.ValidationError({f: f"Must be one of: {', '.join(sorted(ok))}"})
        for f in self.POSITIVE:
            if f in a and a[f] <= 0: raise serializers.ValidationError({f: "Must be greater than 0"})
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
    best = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    rate30 = serializers.SerializerMethodField()
    class Meta:
        model = Habit; fields = "__all__"; read_only_fields = ["user"]
    def get_done_today(self, o): return o.logs.filter(date=date.today()).exists()
    def get_week(self, o):
        days = set(o.logs.values_list("date", flat=True)); t = date.today()
        return [(t - timedelta(days=6 - i)) in days for i in range(7)]
    def get_logs(self, o):
        t = date.today() - timedelta(days=125)
        return sorted(str(d) for d in o.logs.filter(date__gte=t).values_list("date", flat=True))
    def get_total(self, o): return o.logs.count()
    def get_rate30(self, o): return round(o.logs.filter(date__gte=date.today() - timedelta(days=29)).count() * 100 / 30)
    def get_best(self, o):
        best = cur = 0; prev = None
        for d in sorted(o.logs.values_list("date", flat=True)):
            cur = cur + 1 if prev and (d - prev).days == 1 else 1; best = max(best, cur); prev = d
        return best
    def get_streak(self, o):
        days = set(o.logs.values_list("date", flat=True))
        d = date.today() if date.today() in days else date.today() - timedelta(days=1)
        n = 0
        while d in days: n += 1; d -= timedelta(days=1)
        return n

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
