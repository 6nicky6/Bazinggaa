"""QA driver: Omar sends text + inline voice + inline photo to the Aisha chat.
Verifies the pre-bucket inline media pipeline end to end (server side)."""
import base64, io, json, math, struct, sys, time, urllib.request, urllib.error, wave

SB = "https://xnddlmiiargjnekizoew.supabase.co"
ANON = "sb_publishable_bP-3JuTQhVu4-cPQQUSdvQ_Lh-z7dms"

def req(url, method="GET", body=None, headers=None, raw=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode()
            return resp.status, json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        return e.code, {"raw": e.read().decode()[:200]}

store = json.load(open(".test-accounts.json"))
B = store["tester_b"]

# refresh B's session
s, r = req(f"{SB}/auth/v1/token?grant_type=refresh_token", "POST",
           {"refresh_token": B["refresh_token"]}, {"apikey": ANON})
if s != 200:
    sys.exit(f"refresh failed {s}: {r}")
B["jwt"] = r["access_token"]; B["refresh_token"] = r["refresh_token"]
json.dump(store, open(".test-accounts.json", "w"), indent=2)
H = {"apikey": ANON, "Authorization": f"Bearer {B['jwt']}"}

# find the direct chat with A
s, chat = req(f"{SB}/rest/v1/rpc/create_direct_chat", "POST",
              {"p_other_user": store["tester_a"]["uid"]}, H)
if s != 200:
    sys.exit(f"chat lookup failed {s}: {chat}")
cid = chat
print("chat:", cid)

def send(content, label):
    s2, r2 = req(f"{SB}/rest/v1/messages", "POST",
                 {"chat_id": cid, "sender_id": B["uid"], "content": content},
                 {**H, "Prefer": "return=minimal"})
    print(label, "->", s2)

# 1. short text (bubble-width regression test)
send("Hey", "text 'Hey'")

# 2. inline voice note: 2s two-tone wav (16kHz mono 16-bit)
buf = io.BytesIO()
with wave.open(buf, "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
    frames = []
    for i in range(32000):
        t = i / 16000
        f = 440 if t < 1 else 660
        frames.append(struct.pack("<h", int(math.sin(2 * math.pi * f * t) * 12000)))
    w.writeframes(b"".join(frames))
b64 = base64.b64encode(buf.getvalue()).decode()
send(f"⟦bza:2⟧{b64}", f"inline voice ({len(b64)} chars)")

# 3. inline photo: try PIL for a proper photo-ish jpeg; fall back to 1x1 png
try:
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (320, 240), (225, 6, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((90, 50, 230, 190), fill=(246, 184, 0))
    d.text((110, 110), "QA PHOTO", fill=(11, 11, 11))
    ib = io.BytesIO(); img.save(ib, "JPEG", quality=70)
    pb64 = base64.b64encode(ib.getvalue()).decode()
except ImportError:
    pb64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
send(f"⟦bzi⟧{pb64}", f"inline photo ({len(pb64)} chars)")

print("done")
