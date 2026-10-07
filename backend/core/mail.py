import json, os, urllib.request
from email.utils import parseaddr
from django.core.mail.backends.base import BaseEmailBackend

class BrevoBackend(BaseEmailBackend):
    """Sends email over Brevo's HTTPS API (works where SMTP ports are blocked)."""
    def send_messages(self, messages):
        sent = 0
        for m in messages:
            name, addr = parseaddr(m.from_email)
            body = {"sender": {"name": name or "Orbitly", "email": addr}, "to": [{"email": t} for t in m.to], "subject": m.subject, "textContent": m.body}
            req = urllib.request.Request("https://api.brevo.com/v3/smtp/email", json.dumps(body).encode(),
                {"api-key": os.environ["BREVO_API_KEY"], "Content-Type": "application/json", "accept": "application/json"})
            try: urllib.request.urlopen(req, timeout=10); sent += 1
            except Exception:
                if not self.fail_silently: raise
        return sent
