"""Verify the recovery batch: OTP length, schema v3 objects, storage bucket."""
import json, re, sys, time, urllib.request, urllib.error

SB = "https://xnddlmiiargjnekizoew.supabase.co"
ANON = "sb_publishable_bP-3JuTQhVu4-cPQQUSdvQ_Lh-z7dms"
MT = "https://api.mail.tm"

def req(url, method="GET", body=None, headers=None, raw=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
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
A, B = store["tester_a"], store["tester_b"]

# refresh A session
s, r = req(f"{SB}/auth/v1/token?grant_type=refresh_token", "POST",
           {"refresh_token": A["refresh_token"]}, {"apikey": ANON})
if s == 200:
    A["jwt"], A["refresh_token"] = r["access_token"], r["refresh_token"]
    json.dump(store, open(".test-accounts.json", "w"), indent=2)
    print("A session refreshed")
H = {"apikey": ANON, "Authorization": f"Bearer {A['jwt']}"}

# 1. calls table exists?
s, _ = req(f"{SB}/rest/v1/calls?select=id&limit=1", headers=H)
print(f"1. calls table: {'EXISTS ✅' if s == 200 else f'MISSING ({s}) ❌'}")

# 2. groups rpc works?
s, r = req(f"{SB}/rest/v1/rpc/create_group_chat", "POST",
           {"p_type": "group", "p_name": "QA Family", "p_icon": "*", "p_member_ids": [B["uid"]]}, H)
print(f"2. groups rpc: {'WORKS ✅ chat=' + str(r)[:40] if s == 200 else f'FAIL ({s}) ❌ ' + str(r)[:100]}")

# 3. storage bucket upload?
s, r = req(f"{SB}/storage/v1/object/media/qa/probe-{int(time.time())}.txt", "POST",
           headers={"apikey": ANON, "Authorization": f"Bearer {A['jwt']}", "Content-Type": "text/plain"},
           raw=b"recovery probe")
print(f"3. media bucket upload: {'WORKS ✅' if s in (200, 201) else f'FAIL ({s}) ❌ ' + str(r)[:100]}")

# 4. devices table exists?
s, _ = req(f"{SB}/rest/v1/devices?select=user_id&limit=1", headers=H)
print(f"4. devices table: {'EXISTS ✅' if s == 200 else f'MISSING ({s}) ❌'}")

# 5. circles table exists?
s, _ = req(f"{SB}/rest/v1/circles?select=circle&limit=1", headers=H)
print(f"5. circles table: {'EXISTS ✅' if s == 200 else f'MISSING ({s}) ❌'}")

# 6. OTP length: request a fresh email code and count digits
mt_tok = None
s, t = req(f"{MT}/token", "POST", {"address": A["email"], "password": A["mt_password"]})
mt_tok = t.get("token")
if not mt_tok:
    print("6. OTP length: SKIP (mail.tm token failed)")
    sys.exit(0)
_, msgs = req(f"{MT}/messages", headers={"Authorization": f"Bearer {mt_tok}"})
old_ids = {m["id"] for m in msgs.get("hydra:member", [])}
s, r = req(f"{SB}/auth/v1/otp", "POST", {"email": A["email"], "create_user": True}, {"apikey": ANON})
if s != 200:
    print(f"6. OTP length: SKIP (send rate-limited {s} — verify on next login)")
    sys.exit(0)
code = None
for _ in range(25):
    time.sleep(6)
    _, msgs = req(f"{MT}/messages", headers={"Authorization": f"Bearer {mt_tok}"})
    for m in msgs.get("hydra:member", []):
        if m["id"] in old_ids:
            continue
        _, full = req(f"{MT}/messages/{m['id']}", headers={"Authorization": f"Bearer {mt_tok}"})
        text = (full.get("text") or "") + " ".join(full.get("html") or [])
        found = re.findall(r"\b(\d{6,10})\b", text)
        if found:
            code = max(found, key=len)
            break
    if code:
        break
if code:
    ok = len(code) == 6
    print(f"6. OTP length: {len(code)} digits {'✅ (matches app)' if ok else '❌ EXPECTED 6'}")
else:
    print("6. OTP length: no email arrived in 150s — check later")
