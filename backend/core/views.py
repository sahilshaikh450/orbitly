import calendar
from django.conf import settings as dj
from django.core import signing
from django.core.mail import send_mail
from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import authenticate, get_user_model
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Habit, HabitLog, Expense, Todo, Goal, Split, Budget, Recurring, Activity, Profile
from .serializers import *
from .templates_data import TEMPLATES

def _mail(to, subject, body): send_mail(subject, body, dj.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
def _link(k, t): return f"{dj.FRONTEND_URL}/?{k}={t}"
def send_verify(u):
    _mail(u.email, "Verify your Orbitly email", f"Welcome to Orbitly!\n\nVerify your email: {_link('verify', signing.dumps({'u': u.id}, salt='verify'))}\n")

def advance(d, freq):
    if freq == "DAILY": return d + timedelta(days=1)
    if freq == "WEEKLY": return d + timedelta(days=7)
    y, m = d.year + (1 if freq == "YEARLY" else 0), d.month + (1 if freq == "MONTHLY" else 0)
    if m > 12: m, y = 1, y + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))

def log(user, kind, text): Activity.objects.create(user=user, kind=kind, text=text[:200])

class Own(viewsets.ModelViewSet):
    def get_queryset(self): return self.queryset.filter(user=self.request.user).order_by("-id")
    def perform_create(self, s): self.after_create(s.save(user=self.request.user))
    def after_create(self, o): pass

class HabitViewSet(Own):
    queryset = Habit.objects.all(); serializer_class = HabitSerializer
    def after_create(self, o): log(o.user, "HABIT", f"Created habit {o.name}")
    @action(detail=True, methods=["post"])
    def check(self, request, pk=None):
        h = self.get_object(); txt = f"Completed habit {h.name}"
        try: d = date.fromisoformat(request.data.get("date") or str(date.today()))
        except ValueError: d = date.today()
        if d > date.today(): return Response({"error": "Cannot mark future dates"}, status=400)
        l, created = HabitLog.objects.get_or_create(habit=h, date=d)
        if created: Activity.objects.create(user=request.user, kind="HABIT", text=txt, date=d)
        else:
            l.delete(); Activity.objects.filter(user=request.user, kind="HABIT", text=txt, date=d).delete()
        return Response(self.get_serializer(h).data)

class ExpenseViewSet(Own):
    queryset = Expense.objects.all(); serializer_class = ExpenseSerializer
    def after_create(self, o): log(o.user, "MONEY", f"{'Earned' if o.type == 'INCOME' else 'Spent'} {o.amount} - {o.title}")

class TodoViewSet(Own):
    queryset = Todo.objects.all(); serializer_class = TodoSerializer
    def after_create(self, o): log(o.user, "TASK", f"Added task {o.title}")
    @action(detail=True, methods=["post"])
    def focus(self, request, pk=None):
        t = self.get_object(); m = int(request.data.get("minutes", 25))
        t.focus_minutes += m; t.save(); log(request.user, "TASK", f"Focused {m} min on {t.title}")
        return Response(self.get_serializer(t).data)
    def perform_update(self, s):
        old = self.get_object().status; o = s.save()
        if o.status == "DONE" and old != "DONE":
            log(o.user, "TASK", f"Completed task {o.title}")
            if o.repeat != "NONE":
                nd = advance(o.due_date or date.today(), o.repeat)
                while nd < date.today(): nd = advance(nd, o.repeat)
                Todo.objects.create(user=o.user, title=o.title, description=o.description, priority=o.priority, status="TODO", due_date=nd,
                    tags=o.tags, repeat=o.repeat, subtasks=[{**x, "done": False} for x in o.subtasks])

class GoalViewSet(Own):
    queryset = Goal.objects.all(); serializer_class = GoalSerializer
    def after_create(self, o): log(o.user, "GOAL", f"Started goal {o.name}")
    @action(detail=True, methods=["post"])
    def add(self, request, pk=None):
        g = self.get_object(); a = Decimal(str(request.data.get("amount", 0)))
        g.saved = max(Decimal(0), g.saved + a); g.save()
        log(request.user, "GOAL", f"{'Added' if a >= 0 else 'Withdrew'} {abs(a)} {'to' if a >= 0 else 'from'} {g.name}")
        return Response(self.get_serializer(g).data)

class SplitViewSet(Own):
    queryset = Split.objects.all(); serializer_class = SplitSerializer
    def after_create(self, o): log(o.user, "SPLIT", f"Split {o.title} ({o.total}) with {len(o.members) - 1} people")

class RecurringViewSet(Own):
    queryset = Recurring.objects.all(); serializer_class = RecurringSerializer

@api_view(["POST"])
def run_recurring(request):
    n = 0
    for r in Recurring.objects.filter(user=request.user, active=True):
        c = 0
        while r.next_date <= date.today() and c < 24:
            Expense.objects.create(user=r.user, title=r.title, amount=r.amount, type=r.type, category=r.category, payment_method=r.payment_method, date=r.next_date)
            r.next_date = advance(r.next_date, r.frequency); c += 1; n += 1
        r.save()
    return Response({"created": n})

class BudgetViewSet(Own):
    queryset = Budget.objects.all(); serializer_class = BudgetSerializer

def _auth(u):
    t = RefreshToken.for_user(u)
    return Response({"access": str(t.access_token), "refresh": str(t), "name": u.first_name or u.email})

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    d = request.data; email = (d.get("email") or "").lower().strip()
    if not email or len(d.get("password", "")) < 6:
        return Response({"error": "Enter a valid email and a password with 6+ characters"}, status=400)
    User = get_user_model()
    if User.objects.filter(username=email).exists():
        return Response({"error": "This email is already registered"}, status=400)
    u = User.objects.create_user(username=email, email=email, password=d["password"], first_name=d.get("name", ""))
    send_verify(u)
    return _auth(u)

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    u = authenticate(username=(request.data.get("email") or "").lower().strip(), password=request.data.get("password"))
    return _auth(u) if u else Response({"error": "Incorrect email or password"}, status=401)

@api_view(["POST"])
def password(request):
    u = request.user; d = request.data
    if not u.check_password(d.get("old_password", "")): return Response({"error": "Current password is incorrect"}, status=400)
    if len(d.get("new_password", "")) < 6: return Response({"error": "New password must be 6+ characters"}, status=400)
    u.set_password(d["new_password"]); u.save(); return Response({"ok": True})

def streaks(days):
    ds = set(days); best = cur = 0; prev = None
    for d in sorted(ds):
        cur = cur + 1 if prev and (d - prev).days == 1 else 1; best = max(best, cur); prev = d
    t = date.today(); d = t if t in ds else t - timedelta(days=1); n = 0
    while d in ds: n += 1; d -= timedelta(days=1)
    return n, best

@api_view(["GET", "PATCH"])
def profile(request):
    u = request.user; p, _ = Profile.objects.get_or_create(user=u)
    if request.method == "PATCH":
        d = request.data; u.first_name = d.get("name", u.first_name); p.bio = d.get("bio", p.bio); p.currency = d.get("currency", p.currency)
        u.save(); p.save()
    acts = Activity.objects.filter(user=u); days = list(acts.values_list("date", flat=True))
    by_day = {}
    for d in days:
        if d >= date.today() - timedelta(days=370): by_day[str(d)] = by_day.get(str(d), 0) + 1
    kinds = {}
    for k in acts.values_list("kind", flat=True): kinds[k] = kinds.get(k, 0) + 1
    cur, best = streaks(days)
    items = [dict(id=a.id, kind=a.kind, text=a.text, date=str(a.date), time=a.created.strftime("%H:%M")) for a in acts.order_by("-created")[:400]]
    return Response(dict(name=u.first_name, email=u.email, joined=str(u.date_joined.date()), bio=p.bio, currency=p.currency, verified=p.verified,
        current_streak=cur, longest_streak=best, total=len(days), active_days=len(set(days)), by_day=by_day, kinds=kinds, items=items))

@api_view(["GET"])
def templates(request, kind): return Response(TEMPLATES.get(kind, []))

BAD = Response({"error": "This link is invalid or expired"}, status=400)

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot(request):
    u = get_user_model().objects.filter(username=(request.data.get("email") or "").lower().strip()).first()
    if u:
        t = signing.dumps({"u": u.id, "h": u.password[-12:]}, salt="reset")
        _mail(u.email, "Reset your Orbitly password", f"Reset your password (valid for 1 hour): {_link('reset', t)}\n\nIgnore this email if it was not you.\n")
    return Response({"ok": True})

@api_view(["POST"])
@permission_classes([AllowAny])
def reset(request):
    try: d = signing.loads(request.data.get("token", ""), salt="reset", max_age=3600)
    except signing.BadSignature: return Response({"error": "This link is invalid or expired"}, status=400)
    u = get_user_model().objects.filter(id=d["u"]).first(); pw = request.data.get("password", "")
    if not u or u.password[-12:] != d["h"]: return Response({"error": "This link is invalid or expired"}, status=400)
    if len(pw) < 6: return Response({"error": "Password must be 6+ characters"}, status=400)
    u.set_password(pw); u.save(); return Response({"ok": True})

@api_view(["POST"])
@permission_classes([AllowAny])
def verify(request):
    try: d = signing.loads(request.data.get("token", ""), salt="verify", max_age=86400 * 3)
    except signing.BadSignature: return Response({"error": "This link is invalid or expired"}, status=400)
    p, _ = Profile.objects.get_or_create(user_id=d["u"]); p.verified = True; p.save(); return Response({"ok": True})

@api_view(["POST"])
def resend(request): send_verify(request.user); return Response({"ok": True})
