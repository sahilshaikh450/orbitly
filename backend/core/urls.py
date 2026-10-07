from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
r = DefaultRouter()
for n, v in [("habits", views.HabitViewSet), ("expenses", views.ExpenseViewSet), ("todos", views.TodoViewSet), ("goals", views.GoalViewSet), ("splits", views.SplitViewSet), ("budgets", views.BudgetViewSet), ("recurring", views.RecurringViewSet), ("journal", views.JournalViewSet)]:
    r.register(n, v)
urlpatterns = [path("recurring/run/", views.run_recurring), path("auth/refresh/", TokenRefreshView.as_view()), path("health/", views.health), path("auth/forgot/", views.forgot), path("auth/logout/", views.logout), path("auth/reset/", views.reset), path("auth/verify/", views.verify), path("auth/resend/", views.resend), path("auth/register/", views.register), path("auth/login/", views.login), path("auth/password/", views.password),
               path("profile/", views.profile), path("templates/<str:kind>/", views.templates)] + r.urls
