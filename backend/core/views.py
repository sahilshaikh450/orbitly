import calendar
import logging
from django.conf import settings as dj
from django.core import signing
from django.core.mail import send_mail
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.contrib.auth.password_validation import validate_password
from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import authenticate, get_user_model
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from .models import Habit, HabitLog, Expense, Todo, Goal, Split, Budget, Recurring, Journal, Account, Activity, Profile
from .serializers import *
from .templates_data import TEMPLATES

class AuthAnon(AnonRateThrottle): scope = "auth"
class AuthUser(UserRateThrottle): scope = "auth"

def revoke_all(u):
    for t in OutstandingToken.objects.filter(user=u): BlacklistedToken.objects.get_or_create(token=t)

def _mail(to, subject, body):
    try: send_mail(subject, body, dj.DEFAULT_FROM_EMAIL, [to])
    except Exception: logging.getLogger(__name__).exception("Email send failed")
def _link(k, t): return f"{dj.FRONTEND_URL}/?{k}={t}"
def send_verify(u):
    _mail(u.email, "Verify your Orbitly email", f"Welcome to Orbitly!\n\nVerify your email: {_link('verify', signing.dumps({'u': u.id}, salt='verify'))}\n")

def advance(d, freq):
    if freq == "DAILY": return d + timedelta(days=1)
    if freq == "WEEKLY": return d + timedelta(days=7)
    y, m = d.year + (1 if freq == "YEARLY" else 0), d.month + (1 if freq == "MONTHLY" else 0)
    if m > 12: m, y = 1, y + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))

def refill(p):
    m = date.today().strftime("%Y-%m")
    if p.freeze_month != m: p.freezes = 2; p.freeze_month = m; p.save()

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
        if not created and l.frozen: l.frozen = False; l.save(); created = True
        if created: Activity.objects.create(user=request.user, kind="HABIT", text=txt, date=d)
        else:
            l.delete(); Activity.objects.filter(user=request.user, kind="HABIT", text=txt, date=d).delete()
        return Response(self.get_serializer(h).data)
    @action(detail=True, methods=["post"])
    def freeze(self, request, pk=None):
        h = self.get_object(); p, _ = Profile.objects.get_or_create(user=request.user); refill(p); t = date.today()
        try: d = date.fromisoformat(request.data.get("date", ""))
        except ValueError: return Response({"error": "Invalid date"}, status=400)
        if not t - timedelta(days=2) <= d < t: return Response({"error": "You can only freeze one of the last 2 days"}, status=400)
        if p.freezes < 1: return Response({"error": "No streak freezes left this month"}, status=400)
        if HabitLog.objects.filter(habit=h, date=d).exists(): return Response({"error": "That day is already marked"}, status=400)
        HabitLog.objects.create(habit=h, date=d, frozen=True); p.freezes -= 1; p.save()
        return Response(self.get_serializer(h).data)

class ExpenseViewSet(Own):
    queryset = Expense.objects.all(); serializer_class = ExpenseSerializer
    def after_create(self, o): log(o.user, "MONEY", f"{'Earned' if o.type == 'INCOME' else 'Spent'} {o.amount} - {o.title}")
    @action(detail=False, methods=["post"])
    def bulk(self, request):
        rows = request.data
        if not isinstance(rows, list) or not 0 < len(rows) <= 500: return Response({"error": "Send between 1 and 500 rows"}, status=400)
        s = self.get_serializer(data=rows, many=True)
        if not s.is_valid():
            i = next(n for n, e in enumerate(s.errors) if e)
            return Response({"error": f"Row {i + 2}: " + "; ".join(f"{k}: {' '.join(map(str, v))}" for k, v in s.errors[i].items())}, status=400)
        s.save(user=request.user); log(request.user, "MONEY", f"Imported {len(rows)} transactions")
        return Response({"created": len(rows)}, status=201)

class TodoViewSet(Own):
    queryset = Todo.objects.all(); serializer_class = TodoSerializer
    def after_create(self, o): log(o.user, "TASK", f"Added task {o.title}")
    @action(detail=True, methods=["post"])
    def focus(self, request, pk=None):
        t = self.get_object()
        try: m = int(request.data.get("minutes", 25))
        except (TypeError, ValueError): return Response({"error": "Invalid minutes"}, status=400)
        if not 1 <= m <= 240: return Response({"error": "Minutes must be between 1 and 240"}, status=400)
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
        g = self.get_object()
        try: a = Decimal(str(request.data.get("amount", 0)))
        except Exception: return Response({"error": "Invalid amount"}, status=400)
        if not a.is_finite() or abs(a) > 10**9: return Response({"error": "Invalid amount"}, status=400)
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

class JournalViewSet(Own):
    queryset = Journal.objects.all(); serializer_class = JournalSerializer
    def get_queryset(self): return super().get_queryset().order_by("-date")
    def create(self, request, *a, **k):
        s = self.get_serializer(data=request.data); s.is_valid(raise_exception=True)
        d = dict(s.validated_data); day = d.pop("date", date.today())
        obj, created = Journal.objects.update_or_create(user=request.user, date=day, defaults=d)
        if created: log(request.user, "JOURNAL", "Wrote a journal entry")
        return Response(self.get_serializer(obj).data, status=201 if created else 200)

class AccountViewSet(Own):
    queryset = Account.objects.all(); serializer_class = AccountSerializer
    def _hist(self, o):
        t = str(date.today()); o.history = [x for x in o.history if x[0] != t][-199:] + [[t, float(o.balance)]]; o.save(update_fields=["history"])
    def after_create(self, o): self._hist(o); log(o.user, "MONEY", f"Added account {o.name}")
    def perform_update(self, s):
        old = self.get_object().balance; o = s.save()
        if o.balance != old: self._hist(o)

class BudgetViewSet(Own):
    queryset = Budget.objects.all(); serializer_class = BudgetSerializer

def _auth(u):
    t = RefreshToken.for_user(u)
    return Response({"access": str(t.access_token), "refresh": str(t), "name": u.first_name or u.email})

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnon])
def register(request):
    d = request.data; email = (d.get("email") or "").lower().strip()
    try: validate_email(email); validate_password(d.get("password", ""))
    except DjangoValidationError as e: return Response({"error": " ".join(e.messages)}, status=400)
    if len(d.get("name", "")) > 60: return Response({"error": "Name is too long"}, status=400)
    User = get_user_model()
    if User.objects.filter(username=email).exists():
        return Response({"error": "This email is already registered"}, status=400)
    u = User.objects.create_user(username=email, email=email, password=d["password"], first_name=d.get("name", ""))
    send_verify(u)
    return _auth(u)

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnon])
def login(request):
    email = (request.data.get("email") or "").lower().strip()[:254]; key = f"loginfail:{email}"
    if cache.get(key, 0) >= 5: return Response({"error": "Too many failed attempts. Try again in 15 minutes."}, status=429)
    u = authenticate(username=email, password=request.data.get("password"))
    if not u: cache.set(key, cache.get(key, 0) + 1, 900); return Response({"error": "Incorrect email or password"}, status=401)
    cache.delete(key); return _auth(u)

@api_view(["POST"])
@throttle_classes([AuthUser])
def password(request):
    u = request.user; d = request.data
    if not u.check_password(d.get("old_password", "")): return Response({"error": "Current password is incorrect"}, status=400)
    try: validate_password(d.get("new_password", ""), u)
    except DjangoValidationError as e: return Response({"error": " ".join(e.messages)}, status=400)
    u.set_password(d["new_password"]); u.save(); revoke_all(u); return _auth(u)

def streaks(days):
    ds = set(days); best = cur = 0; prev = None
    for d in sorted(ds):
        cur = cur + 1 if prev and (d - prev).days == 1 else 1; best = max(best, cur); prev = d
    t = date.today(); d = t if t in ds else t - timedelta(days=1); n = 0
    while d in ds: n += 1; d -= timedelta(days=1)
    return n, best

@api_view(["GET", "PATCH"])
def profile(request):
    u = request.user; p, _ = Profile.objects.get_or_create(user=u); refill(p)
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
    return Response(dict(name=u.first_name, email=u.email, joined=str(u.date_joined.date()), bio=p.bio, currency=p.currency, verified=p.verified, freezes=p.freezes,
        current_streak=cur, longest_streak=best, total=len(days), active_days=len(set(days)), by_day=by_day, kinds=kinds, items=items))

@api_view(["GET"])
def templates(request, kind): return Response(TEMPLATES.get(kind, []))

BAD = Response({"error": "This link is invalid or expired"}, status=400)

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnon])
def forgot(request):
    u = get_user_model().objects.filter(username=(request.data.get("email") or "").lower().strip()).first()
    if u:
        t = signing.dumps({"u": u.id, "h": u.password[-12:]}, salt="reset")
        _mail(u.email, "Reset your Orbitly password", f"Reset your password (valid for 1 hour): {_link('reset', t)}\n\nIgnore this email if it was not you.\n")
    return Response({"ok": True})

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnon])
def reset(request):
    try: d = signing.loads(request.data.get("token", ""), salt="reset", max_age=3600)
    except signing.BadSignature: return Response({"error": "This link is invalid or expired"}, status=400)
    u = get_user_model().objects.filter(id=d["u"]).first(); pw = request.data.get("password", "")
    if not u or u.password[-12:] != d["h"]: return Response({"error": "This link is invalid or expired"}, status=400)
    try: validate_password(pw, u)
    except DjangoValidationError as e: return Response({"error": " ".join(e.messages)}, status=400)
    u.set_password(pw); u.save(); revoke_all(u); return Response({"ok": True})

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnon])
def verify(request):
    try: d = signing.loads(request.data.get("token", ""), salt="verify", max_age=86400 * 3)
    except signing.BadSignature: return Response({"error": "This link is invalid or expired"}, status=400)
    p, _ = Profile.objects.get_or_create(user_id=d["u"]); p.verified = True; p.save(); return Response({"ok": True})

@api_view(["POST"])
@throttle_classes([AuthUser])
def resend(request): send_verify(request.user); return Response({"ok": True})

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnon])
def logout(request):
    try: RefreshToken(request.data.get("refresh", "")).blacklist()
    except Exception: pass
    return Response({"ok": True})

@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([])
def health(request): return Response({"ok": True})
