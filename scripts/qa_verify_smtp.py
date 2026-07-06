"""Verify custom SMTP: request an OTP and confirm the email arrives via Brevo
from bazingga.app@gmail.com with a 6-digit code."""
import json, re, time, urllib.request, urllib.error

SB = "https://xnddlmiiargjnekizoew.supabase.co"
ANON = "sb_publishable_bP-3JuTQhVu4-cPQQUSdvQ_Lh-z7dms"
MT = "https://api.mail.tm"

def req(url, method="GET", body=None, headers=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode()
            return resp.status, json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}

store = json.load(open(".test-accounts.json"))
A = store["tester_a"]
_, t = req(f"{MT}/token", "POST", {"address": A["email"], "password": A["mt_password"]})
mt_tok = t.get("token")
_, msgs = req(f"{MT}/messages", headers={"Authorization": f"Bearer {mt_tok}"})
old_ids = {m["id"] for m in msgs.get("hydra:member", [])}

s, r = req(f"{SB}/auth/v1/otp", "POST", {"email": A["email"], "create_user": True}, {"apikey": ANON})
print("otp request:", s, "" if s == 200 else r)
if s != 200:
    raise SystemExit("send failed")

for i in range(30):
    time.sleep(5)
    _, msgs = req(f"{MT}/messages", headers={"Authorization": f"Bearer {mt_tok}"})
    for m in msgs.get("hydra:member", []):
        if m["id"] in old_ids:
            continue
        frm = m.get("from", {})
        _, full = req(f"{MT}/messages/{m['id']}", headers={"Authorization": f"Bearer {mt_tok}"})
        text = (full.get("text") or "") + " ".join(full.get("html") or [])
        codes = re.findall(r"\b(\d{6,10})\b", text)
        code = max(codes, key=len) if codes else None
        print(f"EMAIL ARRIVED after ~{(i+1)*5}s")
        print("  from   :", frm.get("address"), "| name:", frm.get("name"))
        print("  subject:", m.get("subject"))
        print("  code   :", len(code) if code else 0, "digits")
        via_brevo = frm.get("address") == "bazingga.app@gmail.com"
        print("  CUSTOM SMTP:", "WORKING ✅" if via_brevo else "NOT USED YET (from " + str(frm.get("address")) + ")")
        raise SystemExit(0)
print("no email in 150s — check Brevo senders/logs")
