# Life OS (React + Django)
## Backend
cd backend && python -m venv venv && source venv/bin/activate   (Windows: venv\Scripts\activate)
pip install -r requirements.txt
python manage.py makemigrations core && python manage.py migrate && python manage.py runserver   # :8000
## Frontend
cd frontend && npm install && npm run dev   # :3000

## Updating an existing install
After replacing the files run (in backend): python manage.py makemigrations core && python manage.py migrate

## Auth emails (forgot password / verify)
In dev, emails are printed in the backend terminal. For production set: EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend,
EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL and FRONTEND_URL (your site URL).
