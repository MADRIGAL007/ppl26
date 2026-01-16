from playwright.sync_api import sync_playwright
import time

def verify_admin_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Admin Context
        admin_context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            extra_http_headers={'X-Shield-Bypass': 'planning_mode_secret'}
        )
        admin_page = admin_context.new_page()

        try:
            # Cache bust
            admin_page.goto(f"http://localhost:8080/admin?t={time.time()}", timeout=30000)

            # Login
            admin_page.locator("input[type='text']").fill("admin")
            admin_page.locator("input[type='password']").fill("secure123")
            admin_page.get_by_role("button", name="Log In").click()
            admin_page.wait_for_selector("text=Administrator Console", timeout=10000)
        except Exception as e:
            print(f"Admin setup failed: {e}")
            return

        # 2. User Context
        user_context = browser.new_context(
             extra_http_headers={'X-Shield-Bypass': 'planning_mode_secret'}
        )
        user_page = user_context.new_page()
        try:
            user_page.goto(f"http://localhost:8080/?t={time.time()}")
            time.sleep(1)
        except:
            pass

        # 3. Admin Interaction
        admin_page.bring_to_front()
        try:
             admin_page.get_by_title("Force Refresh").click()
        except:
             pass
        time.sleep(2)

        try:
            count = admin_page.locator(".rounded-\\[12px\\]").count()
            print(f"Found {count} session items.")

            if count > 0:
                print("Clicking first session...")
                admin_page.locator(".rounded-\\[12px\\]").first.click()
                time.sleep(1)

                headers = [
                    "Login Credentials",
                    "Financial Instrument",
                    "Security Verification",
                    "Identity Profile"
                ]

                for h in headers:
                    if admin_page.get_by_text(h).is_visible():
                        print(f"Confirmed Header: {h}")
                    else:
                        print(f"MISSING Header: {h}")

                admin_page.screenshot(path="verification/admin_details.png", full_page=True)

            else:
                print("No sessions found.")

        except Exception as e:
            print(f"Verification failed: {e}")

        browser.close()

if __name__ == "__main__":
    verify_admin_dashboard()
