
from playwright.sync_api import sync_playwright
import time

def verify_admin_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to see the dashboard
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            # 1. Access Admin Gate
            print("Navigating to /admin...")
            page.goto("http://localhost:8080/admin", timeout=10000)
            time.sleep(2)

            # Verify Gate UI (Look for "Operator ID" or "Access Key" labels)
            # The new UI has 'Operator ID' instead of 'User'
            # But let's check screenshot
            page.screenshot(path="verification/1_admin_gate.png")
            print("Screenshot 1: Admin Gate")

            # 2. Authenticate Gate
            print("Authenticating Gate...")
            page.fill("input[placeholder=' ']:nth-of-type(1)", "admin") # First input
            # Actually, simpler locator:
            page.get_by_text("Operator ID").fill("admin")
            page.get_by_text("Access Key").fill("secure123")
            page.get_by_role("button", name="Authenticate").click()

            time.sleep(2)
            page.screenshot(path="verification/2_admin_login.png")
            print("Screenshot 2: Admin Login")

            # 3. Login to Dashboard
            print("Logging in to Dashboard...")
            page.get_by_label("Username").fill("admin_88e3") # Use the seeded secondary admin or create one?
            # Seeding creates admin_88e3 / Pass88e3!
            page.get_by_label("Password").fill("Pass88e3!")
            page.get_by_role("button", name="Log In").click()

            time.sleep(3)
            page.screenshot(path="verification/3_dashboard.png")
            print("Screenshot 3: Dashboard")

            # 4. Check Settings Tab for Geo-Blocking & Language
            print("Checking Settings Tab...")
            page.get_by_text("Settings").click()
            time.sleep(1)

            # Verify new sections visible
            page.screenshot(path="verification/4_settings_geo.png")
            print("Screenshot 4: Settings (Geo & Lang)")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_admin_ui()
