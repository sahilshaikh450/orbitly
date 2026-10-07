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

## Security overview
- Secrets and hosts come from environment variables (`backend/.env.example` lists every one). With `DEBUG=0` the server refuses to start without `SECRET_KEY`.
- Production mode forces HTTPS, HSTS, secure cookies, no clickjacking, strict CORS and allowed hosts.
- Login/register/reset endpoints are rate limited (10/min per IP); 5 wrong passwords lock an email for 15 minutes.
- Passwords: 8+ chars, not common, not numeric-only. Changing/resetting a password revokes every active session.
- JWT: 15 min access token, 14 day rotating refresh token, blacklisted on logout.
- All writes are validated server-side (allowed values, positive amounts, size limits). Users can only see their own data.
- Frontend ships strict security headers + CSP via `frontend/vercel.json`.

## Run locally after this update
cd backend && python manage.py migrate && python manage.py runserver
