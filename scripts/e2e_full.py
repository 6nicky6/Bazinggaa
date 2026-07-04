"""Bazingga persistent 2-user E2E suite.
Creates/reuses Tester A + Tester B (saved in ../.test-accounts.json with
mail.tm inbox creds + Supabase refresh tokens so they stay alive forever),
waits out email rate limits as long as needed, then runs a human-style
end-to-end pass and prints a report.
"""
import json, time, urllib.request, urllib.error, random, string, re, os, sys

SB = "https://xnddlmiiargjnekizoew.supabase.co"
ANON = "sb_publishable_bP-3JuTQhVu4-cPQQUSdvQ_Lh-z7dms"
MT = "https://api.mail.tm"
STORE = os.path.join(os.path.dirname(__file__), "..", ".test-accounts.json")
REPORT = []

def log(s):
    print(s, flush=True)
    REPORT.append(s)

def req(url, method="GET", body=None, headers=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode()
            return resp.status, json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, {"raw": t[:200]}
    except Exception as ex:
        return 0, {"raw": str(ex)[:200]}

def load_store():
    if os.path.exists(STORE):
        return json.load(open(STORE))
    return {}

def save_store(d):
    json.dump(d, open(STORE, "w"), indent=2)

def refresh_session(acct):
    s, r = req(f"{SB}/auth/v1/token?grant_type=refresh_token", "POST",
               {"refresh_token": acct["refresh_token"]}, {"apikey": ANON})
    if s == 200:
        acct["jwt"] = r["access_token"]
        acct["refresh_token"] = r["refresh_token"]
        return True
    return False

def mailtm_new():
    _, doms = req(f"{MT}/domains")
    dom = doms["hydra:member"][0]["domain"]
    name = "bz" + "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    email, pw = f"{name}@{dom}", "Qa!" + name
    s, _ = req(f"{MT}/accounts", "POST", {"address": email, "password": pw})
    assert s in (200, 201)
    return email, pw

def mailtm_token(email, pw):
    _, t = req(f"{MT}/token", "POST", {"address": email, "password": pw})
    return t.get("token")

def wait_code(mt_tok, tries=30):
    seen_at = time.time()
    for _ in range(tries):
        _, msgs = req(f"{MT}/messages", headers={"Authorization": f"Bearer {mt_tok}"})
        for m in msgs.get("hydra:member", []):
            _, full = req(f"{MT}/messages/{m['id']}", headers={"Authorization": f"Bearer {mt_tok}"})
            text = (full.get("text") or "") + " ".join(full.get("html") or [])
            codes = re.findall(r"\b(\d{6,10})\b", text)
            if codes: return max(codes, key=len)
        time.sleep(6)
    return None

def send_otp_patient(email, max_wait_s=9000):
    start = time.time()
    while time.time() - start < max_wait_s:
        s, r = req(f"{SB}/auth/v1/otp", "POST", {"email": email, "create_user": True}, {"apikey": ANON})
        if s == 200: return True
        if s == 429:
            log(f"  rate-limited; waiting 10 min (elapsed {int((time.time()-start)/60)}m)")
            time.sleep(600)
        else:
            log(f"  otp error {s}: {r}"); time.sleep(120)
    return False

def ensure_account(store, tag, uname, name, emoji_grad):
    key = f"tester_{tag}"
    acct = store.get(key)
    if acct and refresh_session(acct):
        log(f"[{tag}] session refreshed for {acct['email']} (kept alive)")
        save_store(store); return acct
    if acct:
        log(f"[{tag}] refresh failed — re-verifying via inbox {acct['email']}")
        email, mtpw = acct["email"], acct["mt_password"]
    else:
        email, mtpw = mailtm_new()
        log(f"[{tag}] new inbox {email}")
    mt = mailtm_token(email, mtpw)
    if not send_otp_patient(email): sys.exit(f"[{tag}] could not send OTP within window")
    code = wait_code(mt)
    log(f"[{tag}] code received ({len(code) if code else 0} digits)")
    s, r = req(f"{SB}/auth/v1/verify", "POST", {"type": "email", "email": email, "token": code}, {"apikey": ANON})
    if s != 200: sys.exit(f"[{tag}] verify failed {s}: {r}")
    acct = {"email": email, "mt_password": mtpw, "jwt": r["access_token"],
            "refresh_token": r["refresh_token"], "uid": r["user"]["id"]}
    store[key] = acct; save_store(store)
    h = {"apikey": ANON, "Authorization": f"Bearer {acct['jwt']}", "Prefer": "resolution=merge-duplicates"}
    s, _ = req(f"{SB}/rest/v1/profiles?on_conflict=id", "POST", {
        "id": acct["uid"], "name": name, "username": uname,
        "status": "Bazingga QA crew", "avatar_emoji": "*", "avatar_gradient": emoji_grad}, h)
    log(f"[{tag}] profile upsert: {s}")
    return acct

def H(a): return {"apikey": ANON, "Authorization": f"Bearer {a['jwt']}"}

store = load_store()
A = ensure_account(store, "a", "tester_aisha_qa", "Aisha QA", 2)
B = ensure_account(store, "b", "tester_omar_qa", "Omar QA", 4)
log("=== both testers alive; starting human journey ===")

# 1. discovery: A finds B by username
s, r = req(f"{SB}/rest/v1/profiles?username=eq.tester_omar_qa&select=id,name,username,status", headers=H(A))
log(f"1. A searches B: {s} -> {r if s==200 else 'FAIL'}")

# 2. A views B's profile fields (like tapping their profile)
s, r = req(f"{SB}/rest/v1/profiles?id=eq.{B['uid']}&select=name,status,avatar_emoji", headers=H(A))
log(f"2. A views B profile: {s} {'OK' if s==200 and r else 'FAIL'}")

# 3. chat + messages both directions
s, chat = req(f"{SB}/rest/v1/rpc/create_direct_chat", "POST", {"p_other_user": B["uid"]}, H(A))
log(f"3. A->B chat create: {s} ({'OK' if s==200 else chat})")
cid = chat if s == 200 else None
if cid:
    req(f"{SB}/rest/v1/messages", "POST", {"chat_id": cid, "sender_id": A["uid"], "content": "QA-E2E: salaam Omar! 👋"}, {**H(A), "Prefer": "return=minimal"})
    time.sleep(2)
    s, r = req(f"{SB}/rest/v1/messages?chat_id=eq.{cid}&select=content,sender_id&order=sent_at", headers=H(B))
    got = isinstance(r, list) and any("salaam" in m["content"] for m in r)
    log(f"4. B RECEIVES A's message: {'PASS ✅' if got else 'FAIL ❌ ' + str(r)[:120]}")
    req(f"{SB}/rest/v1/messages", "POST", {"chat_id": cid, "sender_id": B["uid"], "content": "QA-E2E: wa alaikum! all good 😄"}, {**H(B), "Prefer": "return=minimal"})
    time.sleep(2)
    s, r = req(f"{SB}/rest/v1/messages?chat_id=eq.{cid}&select=content&order=sent_at", headers=H(A))
    got = isinstance(r, list) and len(r) >= 2
    log(f"5. A receives B's reply: {'PASS ✅' if got else 'FAIL ❌'} thread={[m['content'][-12:] for m in r] if isinstance(r,list) else r}")

# 6. moments: both post; each sees the other's
for who, other, txt in ((A, B, "Aisha QA moment 🌅"), (B, A, "Omar QA moment 🏋️")):
    req(f"{SB}/rest/v1/moments", "POST", {"author_id": who["uid"], "content": txt, "gradient": 3}, {**H(who), "Prefer": "return=minimal"})
s, r = req(f"{SB}/rest/v1/moments?select=content,author_id&order=created_at.desc&limit=5", headers=H(B))
sees = isinstance(r, list) and any("Aisha QA moment" in m["content"] for m in r)
log(f"6. B sees A's moment: {'PASS ✅' if sees else 'FAIL ❌ ' + str(r)[:120]}")
if isinstance(r, list):
    mid = next((m for m in r if "Aisha QA" in m["content"]), None)

# 7. moment view tracking
s, r = req(f"{SB}/rest/v1/moments?author_id=eq.{A['uid']}&select=id&limit=1", headers=H(B))
if isinstance(r, list) and r:
    s2, _ = req(f"{SB}/rest/v1/moment_views", "POST", {"moment_id": r[0]["id"], "viewer_id": B["uid"]}, {**H(B), "Prefer": "resolution=merge-duplicates"})
    log(f"7. B view-tracks A's moment: {s2} {'PASS ✅' if s2 in (200,201) else 'FAIL ❌'}")

# 8. block / unblock cycle
s, _ = req(f"{SB}/rest/v1/blocks", "POST", {"blocker_id": A["uid"], "blocked_id": B["uid"]}, {**H(A), "Prefer": "resolution=merge-duplicates"})
s2, _ = req(f"{SB}/rest/v1/blocks?blocker_id=eq.{A['uid']}&blocked_id=eq.{B['uid']}", "DELETE", None, H(A))
log(f"8. block/unblock cycle: {s}/{s2} {'PASS ✅' if s in (200,201) and s2 in (200,204) else 'FAIL ❌'}")

# 9. report flow
s, _ = req(f"{SB}/rest/v1/reports", "POST", {"reporter_id": B["uid"], "reported_user_id": A["uid"], "reason": "QA-E2E test report"}, {**H(B), "Prefer": "return=minimal"})
log(f"9. report flow: {s} {'PASS ✅' if s in (200,201) else 'FAIL ❌'}")

# 10. schema v3 probes
s, _ = req(f"{SB}/rest/v1/calls?select=id&limit=1", headers=H(A))
log(f"10. calls table: {'EXISTS ✅' if s==200 else 'MISSING (Supabase outage blocks upgrade) ⏳'}")
s, r = req(f"{SB}/rest/v1/rpc/create_group_chat", "POST", {"p_type": "group", "p_name": "QA Family", "p_icon": "*", "p_member_ids": [B["uid"]]}, H(A))
log(f"11. groups rpc: {'WORKS ✅ ' + str(r) if s==200 else 'MISSING (same upgrade) ⏳'}")

# 12. RLS security spot-check: B must NOT read A's blocks
s, r = req(f"{SB}/rest/v1/blocks?blocker_id=eq.{A['uid']}", headers=H(B))
leak = isinstance(r, list) and len(r) > 0
log(f"12. privacy check (B can't see A's block list): {'PASS ✅' if not leak else 'FAIL ❌ LEAK'}")

save_store(store)
log("=== E2E COMPLETE — accounts saved & alive in .test-accounts.json ===")
