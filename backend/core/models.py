from django.conf import settings
from django.db import models
U = settings.AUTH_USER_MODEL

class Habit(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    icon = models.CharField(max_length=8, default="🎯")
    frequency = models.CharField(max_length=10, default="DAILY")
    category = models.CharField(max_length=20, default="OTHER")
    weekly_target = models.PositiveSmallIntegerField(default=7)
    created = models.DateTimeField(auto_now_add=True)

class HabitLog(models.Model):
    habit = models.ForeignKey(Habit, related_name="logs", on_delete=models.CASCADE)
    date = models.DateField()
    class Meta: unique_together = ("habit", "date")

class Expense(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, default="EXPENSE")
    category = models.CharField(max_length=20, default="OTHER")
    payment_method = models.CharField(max_length=10, default="UPI")
    date = models.DateField()

class Todo(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    description = models.CharField(max_length=255, blank=True)
    priority = models.CharField(max_length=10, default="MEDIUM")
    status = models.CharField(max_length=12, default="TODO")
    due_date = models.DateField(null=True, blank=True)
    tags = models.CharField(max_length=120, blank=True)
    subtasks = models.JSONField(default=list, blank=True)
    focus_minutes = models.IntegerField(default=0)
    repeat = models.CharField(max_length=8, default="NONE")

import datetime
class Goal(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    icon = models.CharField(max_length=8, default="🎯")
    kind = models.CharField(max_length=12, default="SAVING")
    target = models.DecimalField(max_digits=12, decimal_places=2)
    saved = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deadline = models.DateField(null=True, blank=True)

class Split(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    paid_by = models.CharField(max_length=60, default="You")
    members = models.JSONField(default=list)
    date = models.DateField(default=datetime.date.today)

class Activity(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    kind = models.CharField(max_length=10)
    text = models.CharField(max_length=200)
    date = models.DateField(default=datetime.date.today)
    created = models.DateTimeField(auto_now_add=True)

class Profile(models.Model):
    user = models.OneToOneField(U, on_delete=models.CASCADE)
    bio = models.CharField(max_length=200, blank=True)
    currency = models.CharField(max_length=4, default="₹")
    verified = models.BooleanField(default=False)

class Budget(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    category = models.CharField(max_length=20)
    limit = models.DecimalField(max_digits=12, decimal_places=2)

class Recurring(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, default="EXPENSE")
    category = models.CharField(max_length=20, default="BILLS")
    payment_method = models.CharField(max_length=10, default="UPI")
    frequency = models.CharField(max_length=10, default="MONTHLY")
    next_date = models.DateField(default=datetime.date.today)
    active = models.BooleanField(default=True)

class Journal(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    date = models.DateField(default=datetime.date.today)
    mood = models.SmallIntegerField(default=3)
    text = models.TextField(blank=True)
    tags = models.CharField(max_length=120, blank=True)
    class Meta: unique_together = ("user", "date")

class Account(models.Model):
    user = models.ForeignKey(U, on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    icon = models.CharField(max_length=8, default="🏦")
    kind = models.CharField(max_length=12, default="BANK")
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    history = models.JSONField(default=list, blank=True)
