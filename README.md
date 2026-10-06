# Life OS (React + Django)
## Backend
cd backend && python -m venv venv && source venv/bin/activate   (Windows: venv\Scripts\activate)
pip install -r requirements.txt
python manage.py makemigrations core && python manage.py migrate && python manage.py runserver   # :8000
## Frontend
cd frontend && npm install && npm run dev   # :3000

## Updating an existing install
After replacing the files run (in backend): python manage.py makemigrations core && python manage.py migrate
