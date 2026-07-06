"""Mint fresh QA sessions and emit ready-to-eval JS inject snippets for the rig.
Falls back to a full email-OTP re-auth (via mail.tm) when a refresh token is dead."""
import json, re, time, urllib.request, urllib.error

SB = "https://xnddlmiiargjnekizoew.supabase.co"
ANON = "sb_publishable_bP-3JuTQhVu4-cPQQUSdvQ_Lh-z7dms"
MT = "https://api.mail.tm"

store = json.load(open(".test-accounts.json"))

def _req(url, method="GET", body=None, headers=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode()
            return resp.status, json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}

def reauth_via_otp(acct):
    """Dead refresh token → send OTP, read the newest 6-digit code from mail.tm, verify."""
    _, t = _req(f"{MT}/token", "POST", {"address": acct["email"], "password": acct["mt_password"]})
    mt = t.get("token")
    _, msgs = _req(f"{MT}/messages", headers={"Authorization": f"Bearer {mt}"})
    old = {m["id"] for m in msgs.get("hydra:member", [])}
    for _ in range(5):
        s, _r = _req(f"{SB}/auth/v1/otp", "POST", {"email": acct["email"], "create_user": True}, {"apikey": ANON})
        if s == 200:
            break
        time.sleep(60)
    code = None
    for _ in range(25):
        time.sleep(5)
        _, msgs = _req(f"{MT}/messages", headers={"Authorization": f"Bearer {mt}"})
        for m in msgs.get("hydra:member", []):
            if m["id"] in old:
                continue
            _, full = _req(f"{MT}/messages/{m['id']}", headers={"Authorization": f"Bearer {mt}"})
            text = (full.get("text") or "") + " ".join(full.get("html") or [])
            found = re.findall(r"\b(\d{6})\b", text)
            if found:
                code = found[0]; break
        if code:
            break
    s, r = _req(f"{SB}/auth/v1/verify", "POST", {"type": "email", "email": acct["email"], "token": code}, {"apikey": ANON})
    if s != 200:
        raise SystemExit(f"reauth failed {s}: {r}")
    return r

def refresh(acct):
    req = urllib.request.Request(f"{SB}/auth/v1/token?grant_type=refresh_token",
                                 data=json.dumps({"refresh_token": acct["refresh_token"]}).encode(),
                                 headers={"apikey": ANON, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError:
        print(f"  refresh dead for {acct['email']} — re-auth via OTP…")
        return reauth_via_otp(acct)

profiles = {
    "tester_a": ("Aisha QA", "tester_aisha_qa", "AISHA", ["#E10600", "#FF4D3D"]),
    "tester_b": ("Omar QA", "tester_omar_qa", "OMAR", ["#0891B2", "#22D3EE"]),
}

snippets = {}
for tag, (name, uname, rig, grad) in profiles.items():
    d = refresh(store[tag])
    store[tag]["jwt"] = d["access_token"]
    store[tag]["refresh_token"] = d["refresh_token"]
    session = {
        "access_token": d["access_token"], "token_type": "bearer", "expires_in": 3600,
        "expires_at": int(time.time()) + 3500, "refresh_token": d["refresh_token"],
        "user": {"id": store[tag]["uid"], "email": store[tag]["email"],
                 "aud": "authenticated", "role": "authenticated"},
    }
    persisted = {"state": {
        "authed": True, "onboarded": True,
        "profile": {"name": name, "username": uname, "phone": "", "statusText": "Bazingga QA crew",
                    "avatarEmoji": "⚡", "avatarGradient": grad},
        "settings": {"smartReplies": True, "notifications": True},
        "chats": [], "messages": [], "moments": [], "calls": [], "blocked": [],
        "lastReadAt": {}, "circles": {"close": [], "family": []},
    }, "version": 0}
    snippets[rig] = {"session": session, "persisted": persisted}

json.dump(store, open(".test-accounts.json", "w"), indent=2)
json.dump(snippets, open(".qa-rig-inject.json", "w"))
print("minted fresh; wrote .qa-rig-inject.json for", list(snippets.keys()))
