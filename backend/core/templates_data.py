def H(i, n, d, f, c): return dict(icon=i, name=n, description=d, frequency=f, category=c)
def E(t, a, ty, c, p="UPI"): return dict(title=t, amount=a, type=ty, category=c, payment_method=p)
def T(t, d, p, tags): return dict(title=t, description=d, priority=p, status="TODO", tags=tags)
TEMPLATES = {
 "habits": [
  H("🧘","Morning Meditation","10 minutes of mindfulness","DAILY","MINDFULNESS"),
  H("💪","Daily Exercise","30 minutes workout","DAILY","FITNESS"),
  H("📚","Read 20 Pages","Read every day","DAILY","LEARNING"),
  H("💧","Drink 8 Glasses Water","Stay hydrated","DAILY","HEALTH"),
  H("📵","No Social Media","Digital detox","DAILY","PRODUCTIVITY"),
  H("✍️","Gratitude Journal","Write 3 things grateful for","DAILY","MINDFULNESS"),
  H("🚿","Cold Shower","Build discipline","DAILY","HEALTH"),
  H("💡","Learn New Skill","1 hour daily learning","DAILY","LEARNING"),
  H("🚶","Walk 10k Steps","Stay active","DAILY","FITNESS"),
  H("😴","Sleep by 11pm","Better sleep schedule","DAILY","HEALTH"),
  H("🎯","Weekly Review","Review goals weekly","WEEKLY","PRODUCTIVITY"),
  H("📞","Call Family","Stay connected","WEEKLY","SOCIAL")],
 "expenses": [
  E("Salary",50000,"INCOME","SALARY","BANK"), E("Freelance Payment",15000,"INCOME","SALARY","BANK"),
  E("Grocery Shopping",1500,"EXPENSE","FOOD"), E("Rent",12000,"EXPENSE","HOME","BANK"),
  E("Electricity Bill",1800,"EXPENSE","BILLS"), E("Petrol",1000,"EXPENSE","TRAVEL","CASH"),
  E("Netflix / OTT",499,"EXPENSE","ENTERTAINMENT","CARD"), E("Eating Out",800,"EXPENSE","FOOD"),
  E("Gym Membership",1200,"EXPENSE","HEALTH"), E("SIP Investment",5000,"EXPENSE","INVEST","BANK"),
  E("Mobile Recharge",299,"EXPENSE","BILLS"), E("Online Shopping",2500,"EXPENSE","SHOPPING","CARD")],
 "todos": [
  T("Plan my week","List top 3 goals","HIGH","planning"), T("Clear inbox","Reply to pending emails","MEDIUM","work"),
  T("Pay bills","Electricity, internet, phone","URGENT","finance"), T("Workout session","45 min gym","MEDIUM","health"),
  T("Study session","2 hours deep work","HIGH","study"), T("Clean room","Weekend reset","LOW","home"),
  T("Grocery run","Weekly groceries","LOW","home"), T("Backup files","Laptop + phone","MEDIUM","tech"),
  T("Call a friend","Catch up","LOW","social"), T("Update resume","Add latest projects","HIGH","career"),
  T("Doctor appointment","Book a check-up","MEDIUM","health"), T("Read an article","Learn something new","LOW","study")],
}
