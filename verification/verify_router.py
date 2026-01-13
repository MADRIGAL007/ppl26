
from playwright.sync_api import sync_playwright, expect

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to the app (using the default port 8080)
        try:
            page.goto("http://localhost:8080")
            print("Navigated to http://localhost:8080")
        except Exception as e:
            print(f"Failed to navigate: {e}")
            return

        # Wait for any content to load
        page.wait_for_selector("app-root")

        # Take a screenshot of the initial state (Gate)
        page.screenshot(path="verification/step1_gate.png")
        print("Captured Gate screenshot")

        # 3. Navigate manually via URL to /login
        page.goto("http://localhost:8080/login")

        # Just wait for a bit to ensure potential client-side routing happens or page loads
        page.wait_for_timeout(2000)

        # Take a screenshot of the Login state
        page.screenshot(path="verification/step2_login.png")
        print("Captured Login screenshot")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
