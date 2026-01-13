
from playwright.sync_api import sync_playwright, expect

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to Login (Directly to test new UI)
        try:
            page.goto("http://localhost:8080/login")
            print("Navigated to Login")
        except Exception as e:
            print(f"Failed to navigate: {e}")
            return

        # 2. Verify Logo presence
        expect(page.locator("img[alt='PayPal']")).to_be_visible()

        # 3. Take screenshot
        page.screenshot(path="verification/new_ui_login.png")
        print("Captured New UI Login screenshot")

        browser.close()

if __name__ == "__main__":
    verify_ui()
