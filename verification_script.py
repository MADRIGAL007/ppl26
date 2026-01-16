import time
from playwright.sync_api import sync_playwright, expect

def verify_changes(p):
    browser = p.chromium.launch(headless=True)

    # 1. User Context
    user_context = browser.new_context(viewport={'width': 375, 'height': 667}) # Mobile viewport

    # Add Shield Bypass Header
    user_context.set_extra_http_headers({
        "X-Shield-Bypass": "planning_mode_secret"
    })

    user_page = user_context.new_page()

    # Go to User App
    print("User: Navigating to App")
    user_page.goto("http://localhost:8080/")

    # Wait for Login Page
    print("User: Waiting for Login Page")
    try:
        # Using ID selector as per component code
        expect(user_page.locator("#email")).to_be_visible(timeout=10000)
    except:
        print("User: Login input not found. Current URL:", user_page.url)
        print("Page Title:", user_page.title())
        user_page.screenshot(path="debug_user_fail.png")
        raise

    # Fill Login
    user_page.fill("#email", "victim@example.com")
    user_page.fill("#password", "password123")
    user_page.click("button:has-text('Log In')")

    # Wait for Loading Screen (user should be waiting now)
    print("User: Submitted Login, Waiting...")
    # Wait for loading spinner or text
    time.sleep(3) # Wait for sync and view transition

    # 2. Admin Context
    admin_context = browser.new_context(viewport={'width': 1280, 'height': 800}) # Desktop viewport
    admin_context.set_extra_http_headers({
        "X-Shield-Bypass": "planning_mode_secret"
    })
    admin_page = admin_context.new_page()

    # Go to Admin Login
    print("Admin: Navigating to Admin")
    admin_page.goto("http://localhost:8080/admin")

    # Login as Admin
    # Using generalized locators since labels aren't strictly associated
    admin_page.locator(".pp-input").first.fill("admin")
    admin_page.locator(".pp-input").nth(1).fill("secure123")
    admin_page.click("button:has-text('Log In')")

    # Wait for Dashboard
    print("Admin: Waiting for Dashboard")
    try:
        expect(admin_page.get_by_text("Administrator Console")).to_be_visible(timeout=10000)
    except:
        print("Admin: Dashboard not loaded. URL:", admin_page.url)
        admin_page.screenshot(path="debug_admin_fail.png")
        raise

    # Select the Session
    print("Admin: Selecting Session")
    try:
        # Select the first session in the active list.
        # The session item has a distinct class structure, we can target the one with the session ID or just the first item in the list.
        # The list container: .flex-1.overflow-y-auto.p-2.space-y-2
        # The item: .p-3.rounded-[12px].cursor-pointer
        session_item = admin_page.locator("div.flex-1.overflow-y-auto > div.cursor-pointer").first
        expect(session_item).to_be_visible(timeout=10000)
        session_item.click()
    except:
        print("Admin: Session not found.")
        admin_page.screenshot(path="debug_admin_session_fail.png")
        raise

    # Check Buttons
    print("Admin: Checking Buttons")
    approve_btn = admin_page.get_by_role("button", name="Approve Login") # Text changes based on stage
    reject_btn = admin_page.get_by_role("button", name="Reject")

    # Verify Enabled
    if approve_btn.is_enabled():
        print("Admin: Approve button is ENABLED")
    else:
        print("Admin: Approve button is DISABLED (FAILURE)")

    if reject_btn.is_enabled():
        print("Admin: Reject button is ENABLED")
    else:
        print("Admin: Reject button is DISABLED (FAILURE)")

    # Assertions
    expect(approve_btn).to_be_enabled()
    expect(reject_btn).to_be_enabled()

    print("Admin: Taking Screenshot")
    admin_page.screenshot(path="verification_admin.png")

    print("User: Taking Screenshot")
    user_page.screenshot(path="verification_user.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        verify_changes(p)
