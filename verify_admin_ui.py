from playwright.sync_api import sync_playwright
import time
import json

def verify(page):
    print("Navigating to Admin...")
    page.goto("http://localhost:8080/admin", wait_until="networkidle")

    # Login if needed
    if page.is_visible("text=Security Console"):
        print("Logging in...")
        page.fill("input[type='text']", "admin")
        page.fill("input[type='password']", "secure123")
        page.click("button:has-text('Log In')")
        page.wait_for_selector("text=Administrator Console")

    print("Mocking Sessions...")
    mock_sessions = [
        {
            "sessionId": "sess_rec_1",
            "timestamp": int(time.time() * 1000),
            "lastSeen": int(time.time() * 1000),
            "email": "recurring@test.com",
            "status": "Active",
            "stage": "login",
            "currentView": "loading",
            "isRecurring": True,
            "linkedSessionId": "sess_old_1",
            "fingerprint": {"ip": "1.2.3.4", "userAgent": "TestAgent"},
            "isLoginVerified": False
        },
        {
            "sessionId": "sess_card_1",
            "timestamp": int(time.time() * 1000) - 5000,
            "lastSeen": int(time.time() * 1000),
            "email": "card_wait@test.com",
            "status": "Active",
            "stage": "card_pending",
            "currentView": "loading",
            "fingerprint": {"ip": "5.6.7.8", "userAgent": "TestAgent"},
            "isLoginVerified": True
        }
    ]

    # Intercept API to return mocks
    page.route("**/api/sessions?**", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(mock_sessions)
    ))

    # Also intercept bare /api/sessions
    page.route("**/api/sessions", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(mock_sessions)
    ))

    # Click Refresh to trigger fetch
    print("Refreshing...")
    page.click("button[title='Force Refresh']")
    page.wait_for_timeout(2000) # Wait for processing

    # Screenshot List
    print(" taking screenshot 1...")
    page.screenshot(path="/home/jules/verification/admin_list.png")

    # Select Recurring Session
    print("Selecting recurring session...")
    page.click("text=recurring@test.com")
    page.wait_for_timeout(1000)

    # Screenshot Detail
    print(" taking screenshot 2...")
    page.screenshot(path="/home/jules/verification/admin_detail.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1400, "height": 900},
            extra_http_headers={"X-Shield-Bypass": "planning_mode_secret"}
        )
        page = context.new_page()
        try:
            verify(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
