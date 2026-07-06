"""Verify the nightly sweep actually cleared media messages, calls, storage."""
import json, urllib.request, urllib.error

SB = "https://xnddlmiiargjnekizoew.supabase.co"
ANON = "sb_publishable_bP-3JuTQhVu4-cPQQUSdvQ_Lh-z7dms"

store = json.load(open(".test-accounts.json"))
A = store["tester_a"]

req = urllib.request.Request(f"{SB}/auth/v1/token?grant_type=refresh_token",
                             data=json.dumps({"refresh_token": A["refresh_token"]}).encode(),
                             headers={"apikey": ANON, "Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=20) as r:
    d = json.loads(r.read())
A["jwt"], A["refresh_token"] = d["access_token"], d["refresh_token"]
json.dump(store, open(".test-accounts.json", "w"), indent=2)
H = {"apikey": ANON, "Authorization": "Bearer " + A["jwt"]}

def count(path, label):
    req2 = urllib.request.Request(SB + path, headers={**H, "Prefer": "count=exact", "Range": "0-0"})
    try:
        with urllib.request.urlopen(req2, timeout=20) as r2:
            cr = r2.headers.get("Content-Range", "?")
            print(label, "->", cr.split("/")[-1])
    except urllib.error.HTTPError as e:
        # 416 means range beyond size -> 0 rows also possible; read header anyway
        cr = e.headers.get("Content-Range", "?") if e.headers else "?"
        print(label, "->", cr.split("/")[-1] if cr != "?" else f"ERR {e.code}")

count("/rest/v1/messages?select=id&content=like.%E2%9F%A6bza%3A*", "inline voice msgs")
count("/rest/v1/messages?select=id&content=like.%E2%9F%A6bzi%E2%9F%A7*", "inline photo msgs")
count("/rest/v1/calls?select=id", "calls rows")

req3 = urllib.request.Request(SB + "/storage/v1/object/list/media",
                              data=json.dumps({"prefix": "", "limit": 100}).encode(),
                              headers={**H, "Content-Type": "application/json"}, method="POST")
try:
    with urllib.request.urlopen(req3, timeout=20) as r3:
        items = json.loads(r3.read())
        print("storage root entries ->", [i.get("name") for i in items])
except urllib.error.HTTPError as e:
    print("storage list ERR", e.code, e.read().decode()[:150])
