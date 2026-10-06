from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views
r = DefaultRouter()
for n, v in [("habits", views.HabitViewSet), ("expenses", views.ExpenseViewSet), ("todos", views.TodoViewSet), ("goals", views.GoalViewSet), ("splits", views.SplitViewSet), ("budgets", views.BudgetViewSet)]:
    r.register(n, v)
urlpatterns = [path("auth/register/", views.register), path("auth/login/", views.login), path("auth/password/", views.password),
               path("profile/", views.profile), path("templates/<str:kind>/", views.templates)] + r.urls
