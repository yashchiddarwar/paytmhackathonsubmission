import urllib.request, json, sys

def post(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body.decode()

BASE = "http://localhost:8000"

print("=== REGISTER ===")
status, resp = post(f"{BASE}/api/auth/register", {"email": "demo@claimease.com", "password": "demo123", "full_name": "Demo User"})
print(f"Status: {status}")
if isinstance(resp, dict):
    print("user:", resp.get("user"))
    token = resp.get("access_token","")
    print("token prefix:", token[:40], "...")
else:
    print(resp)

print("\n=== LOGIN ===")
status2, resp2 = post(f"{BASE}/api/auth/login", {"email": "demo@claimease.com", "password": "demo123"})
print(f"Status: {status2}")
if isinstance(resp2, dict):
    print("user:", resp2.get("user"))
    token2 = resp2.get("access_token","")
    print("token prefix:", token2[:40], "...")
else:
    print(resp2)

print("\n=== WRONG PASSWORD ===")
status3, resp3 = post(f"{BASE}/api/auth/login", {"email": "demo@claimease.com", "password": "wrongpass"})
print(f"Status: {status3}, detail:", resp3.get("detail") if isinstance(resp3, dict) else resp3)
