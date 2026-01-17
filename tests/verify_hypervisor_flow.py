import requests
import json
import time

BASE_URL = 'http://localhost:8080'

def test_flow():
    session = requests.Session()

    # 1. Login as Hypervisor
    print("[Test] Logging in as Hypervisor...")
    res = session.post(f'{BASE_URL}/api/admin/login', json={
        'username': 'madrigal.sd',
        'password': 'Madrigal007@'
    })

    if res.status_code != 200:
        print(f"FAILED: Login failed {res.status_code} {res.text}")
        return

    data = res.json()
    token = data['token']
    user = data['user']
    print(f"SUCCESS: Logged in as {user['username']} ({user['role']})")

    headers = {'Authorization': f'Bearer {token}'}

    # 2. Create Admin
    print("\n[Test] Creating new Admin...")
    admin_user = f"admin_{int(time.time())}"
    res = session.post(f'{BASE_URL}/api/admin/users', headers=headers, json={
        'username': admin_user,
        'password': 'password123',
        'role': 'admin',
        'uniqueCode': f"code_{int(time.time())}"
    })

    if res.status_code != 200:
        print(f"FAILED: Create user failed {res.text}")
        return

    new_admin_id = res.json()['id']
    print(f"SUCCESS: Created admin {admin_user} (ID: {new_admin_id})")

    # 3. Impersonate
    print("\n[Test] Impersonating Admin...")
    res = session.post(f'{BASE_URL}/api/admin/impersonate/{new_admin_id}', headers=headers)

    if res.status_code != 200:
        print(f"FAILED: Impersonation failed {res.text}")
        return

    impersonate_token = res.json()['token']
    print("SUCCESS: Got impersonation token")

    # Verify Identity
    res = session.get(f'{BASE_URL}/api/admin/me', headers={'Authorization': f'Bearer {impersonate_token}'})
    me = res.json()
    if me['username'] == admin_user:
        print(f"Verified: Now acting as {me['username']}")
    else:
        print(f"FAILED: Identity mismatch. Expected {admin_user}, got {me['username']}")

    # 4. Sync Session with Code
    print("\n[Test] simulating traffic with unique code...")
    user_session_id = f"sess_{int(time.time())}"
    res = requests.post(f'{BASE_URL}/api/sync', json={
        'sessionId': user_session_id,
        'adminCode': me['uniqueCode'],
        'stage': 'login',
        'currentView': 'login',
        'fingerprint': {'userAgent': 'TestBot'}
    })

    if res.status_code == 200:
        print("SUCCESS: Session synced")
    else:
        print(f"FAILED: Sync failed {res.text}")

    # 5. Check visibility
    print("\n[Test] Checking session visibility...")

    # Admin should see it
    res = session.get(f'{BASE_URL}/api/sessions', headers={'Authorization': f'Bearer {impersonate_token}'})
    sessions = res.json()
    found = any(s['sessionId'] == user_session_id for s in sessions)
    if found:
        print("SUCCESS: Admin sees the session")
    else:
        print("FAILED: Admin CANNOT see the session")

    # Hypervisor should see it too (need original token, but let's assume we kept it or login again)
    # Re-login as Hypervisor to check visibility
    # ...

    print("\n[Test] Complete.")

if __name__ == "__main__":
    test_flow()
