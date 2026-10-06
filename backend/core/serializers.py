from datetime import date, timedelta
from rest_framework import serializers
from .models import Habit, Expense, Todo, Goal, Split, Budget

class HabitSerializer(serializers.ModelSerializer):
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

def make(model):
    class S(serializers.ModelSerializer):
        class Meta:
            fields = "__all__"; read_only_fields = ["user"]
    S.Meta.model = model
    return S
ExpenseSerializer, TodoSerializer, GoalSerializer, SplitSerializer, BudgetSerializer = make(Expense), make(Todo), make(Goal), make(Split), make(Budget)
