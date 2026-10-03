import urllib.request, json

def post(url, payload=None, token=None):
    data = json.dumps(payload).encode() if payload else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def get(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def put(url, payload, token=None):
    data = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

BASE = "http://localhost:8000"

print("--- 1. Testing Demo Login ---")
status, res = post(f"{BASE}/api/auth/demo-login")
print(f"Demo Login Status: {status}")
assert status == 200, res
token = res["access_token"]
user = res["user"]
print(f"User: {user['fullName']} ({user['email']}), Phone: {user.get('phone')}, CKYC: {user.get('ckyc')}")

print("\n--- 2. Testing Update Profile ---")
status, res = put(f"{BASE}/api/auth/profile", {"fullName": "Arjun Sharma", "phone": "+91 99887 76655", "nomineeName": "Pooja Sharma"}, token=token)
print(f"Update Profile Status: {status}")
assert status == 200, res
print(f"Updated: {res['fullName']}, Phone: {res['phone']}, Nominee: {res['nomineeName']}")

print("\n--- 3. Testing Policies List ---")
status, pols = get(f"{BASE}/api/policies", token=token)
print(f"Policies Status: {status}, Total policies in DB: {len(pols)}")
for p in pols:
    print(f" - {p['policyNumber']}: {p['carrier']} ({p['productName']}) [Status: {p['status']}]")

print("\n--- 4. Testing DB Status ---")
status, dbstat = get(f"{BASE}/api/db/status")
print(f"DB Status: {dbstat['status']}, Claims: {dbstat['totalClaims']}, Policies: {dbstat['totalPolicies']}")
print("\nALL VERIFICATIONS PASSED!")
