"""Mint fresh QA sessions and emit ready-to-eval JS inject snippets for the rig."""
import json, time, urllib.request

SB = "https://xnddlmiiargjnekizoew.supabase.co"
ANON = "sb_publishable_bP-3JuTQhVu4-cPQQUSdvQ_Lh-z7dms"

store = json.load(open(".test-accounts.json"))

def refresh(acct):
    req = urllib.request.Request(f"{SB}/auth/v1/token?grant_type=refresh_token",
                                 data=json.dumps({"refresh_token": acct["refresh_token"]}).encode(),
                                 headers={"apikey": ANON, "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

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
