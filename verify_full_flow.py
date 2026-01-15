
import asyncio
from playwright.async_api import async_playwright, expect

# Config
BASE_URL = "http://localhost:8080"
ADMIN_USER = "admin"
ADMIN_PASS = "secure123"
GATE_PASS = "password"
TEST_EMAIL = "test@example.com"

async def select_session(page, email):
    """Helper to select the session in Admin Dashboard"""
    print(f"[Admin] Looking for session with email: {email}...")
    try:
        # Debug: Print all sessions
        sessions = page.locator('div.cursor-pointer')
        count = await sessions.count()
        print(f"[Admin] Found {count} sessions in list.")
        for i in range(count):
            txt = await sessions.nth(i).inner_text()
            print(f"[Admin] Session {i}: {txt.replace(chr(10), ' ')}")

        # Wait for the list item to appear
        # The text might be empty if the email isn't rendering
        try:
             item = page.locator(f'div:has-text("{email}")').last
             await item.wait_for(state='visible', timeout=5000)
        except:
             print("[Admin] Email not found in list, trying fallback 'No Email'...")
             item = page.locator('div:has-text("No Email")').last
             await item.wait_for(state='visible', timeout=5000)

        await item.click()
        # Wait for details to populate
        # await page.locator(f'p:has-text("{email}")').wait_for(state='visible', timeout=2000)
        print("[Admin] Session selected.")
    except Exception as e:
        print(f"[Admin] Warning: Failed to select session: {e}")
        # Try finding any session
        try:
             first = page.locator('div.cursor-pointer').first
             await first.click()
             print("[Admin] Selected first available session.")
        except:
             pass
        raise e

async def run():
    async with async_playwright() as p:
        browser_admin = await p.chromium.launch(headless=True)
        # Use Firefox for user to ensure full isolation
        browser_user = await p.firefox.launch(headless=True)

        # --- Admin Context ---
        admin_context = await browser_admin.new_context(viewport={'width': 1280, 'height': 800})
        print("[Admin] Logging in...")
        page_admin = await admin_context.new_page()
        page_admin.on("console", lambda msg: print(f"[Admin Console] {msg.text}"))
        await page_admin.goto(f"{BASE_URL}/admin")

        # Check for Gate (Admin side)
        if await page_admin.locator('app-gate').count() > 0 or await page_admin.locator('h1:has-text("Enter Password")').count() > 0:
             print("[Admin] Unlocking Gate...")
             await page_admin.fill('input[type="password"]', GATE_PASS)
             await page_admin.click('button:has-text("Unlock")')
             await page_admin.wait_for_timeout(1000)

        # Check for Admin Login Form
        try:
            await page_admin.wait_for_selector('app-admin-dashboard', state='attached', timeout=5000)
        except:
            pass

        try:
             await page_admin.wait_for_selector('input[type="text"]', timeout=3000)
             print("[Admin] Filling credentials...")
             await page_admin.fill('input[type="text"]', ADMIN_USER)
             await page_admin.fill('input[type="password"]', ADMIN_PASS)
             await page_admin.click('button:has-text("Log In")')
             await page_admin.wait_for_selector('h1:has-text("Administrator Console")', timeout=10000)
        except Exception as e:
             print("[Admin] Login form not found or already logged in. Checking for dashboard...")
             await page_admin.wait_for_selector('h1:has-text("Administrator Console")', timeout=10000)

        print("[Admin] Dashboard Ready.")

        # --- User Context ---
        user_context = await browser_user.new_context(viewport={'width': 375, 'height': 812})
        print("[User] Starting Verification Flow...")
        page_user = await user_context.new_page()

        page_user.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        await page_user.goto(f"{BASE_URL}/login")

        # Clear LocalStorage
        await page_user.evaluate("localStorage.clear()")

        # GATE CHECK
        if await page_user.locator('app-gate').count() > 0 or await page_user.locator('h1:has-text("Enter Password")').count() > 0:
            print("[User] Gate detected. Unlocking...")
            await page_user.fill('input[type="password"]', GATE_PASS)
            await page_user.click('button:has-text("Unlock")')
            await page_user.wait_for_url(f"{BASE_URL}/security_check", timeout=5000)
            await asyncio.sleep(4)

        if "/login" not in page_user.url:
             print(f"[User] Navigating to /login (Current: {page_user.url})")
             await page_user.goto(f"{BASE_URL}/login")

        # 1. LOGIN
        print("[User] Step 1: Login")
        try:
            await page_user.wait_for_selector('input#email', timeout=5000)
            await page_user.fill('input#email', TEST_EMAIL)
            await page_user.fill('input[type="password"]', 'password123')
            await page_user.click('button:has-text("Log In")')
        except Exception as e:
            print(f"[User] Failed at Login Step. Current URL: {page_user.url}")
            await page_user.screenshot(path="error_login_step.png")
            raise e

        print("[User] Waiting for Admin Approval (Login)...")
        await asyncio.sleep(4)  # Wait for sync

        # Admin Approve
        print("[Admin] Approving Login...")
        try:
            await select_session(page_admin, TEST_EMAIL)

            approve_btn = page_admin.locator('button:has-text("Approve")').first
            await approve_btn.wait_for(state='visible', timeout=5000)
            await approve_btn.click()
        except Exception as e:
            print(f"[Admin] Error finding session to approve: {e}")
            await page_admin.screenshot(path="admin_error_login.png")
            raise e

        # User check -> Limited
        print("[User] Waiting for redirect to /limited...")
        try:
             await page_user.wait_for_url(f"{BASE_URL}/limited", timeout=30000)
        except Exception as e:
             print(f"[User] Failed to reach /limited. Current URL: {page_user.url}")
             await page_user.screenshot(path="error_step1_limited.png")
             raise e
        print("[User] Reached /limited.")

        # 2. LIMITED -> PHONE
        print("[User] Step 2: Clicking Confirm Identity...")
        try:
            await page_user.click('button:has-text("Confirm Identity")')
            await page_user.wait_for_url(f"{BASE_URL}/phone", timeout=10000)
        except Exception as e:
            print(f"[User] Failed to navigate to /phone. Current URL: {page_user.url}")
            await page_user.screenshot(path="error_step2_phone.png")
            raise e
        print("[User] Reached /phone.")

        # 3. PHONE
        print("[User] Step 3: Phone Verification")
        try:
            await page_user.wait_for_selector('input#phone', timeout=5000)
            await page_user.fill('input#phone', '5551234567')
            await page_user.click('button:has-text("Next")')

            print("[User] Entering Phone OTP...")
            await page_user.wait_for_selector('input[id^="otp-"]', timeout=5000)

            for i in range(6):
                await page_user.type(f'#otp-{i}', str(i+1))

            await page_user.click('button:has-text("Continue")')
        except Exception as e:
            print(f"[User] Failed at Phone Step. Current URL: {page_user.url}")
            await page_user.screenshot(path="error_step3_phone.png")
            raise e

        print("[User] Waiting for Admin Approval (Phone)...")
        await asyncio.sleep(3)

        # Admin Approve
        print("[Admin] Approving Phone...")
        try:
             await select_session(page_admin, TEST_EMAIL)

             # Verify Phone Number on Admin
             print("[Admin] Verifying Phone Data...")
             await expect(page_admin.locator('p:has-text("5551234567")')).to_be_visible()
             print("[Admin] Phone Verified.")

             approve_btn = page_admin.locator('button:has-text("Approve Phone")').first
             await approve_btn.wait_for(state='visible', timeout=10000)
             await approve_btn.click()
        except Exception as e:
             print("[Admin] Failed at Phone Approval.")
             await page_admin.screenshot(path="admin_error_phone.png")
             raise e

        # User check -> Personal
        await page_user.wait_for_url(f"{BASE_URL}/personal", timeout=10000)
        print("[User] Reached /personal.")

        # 4. PERSONAL
        print("[User] Step 4: Personal Info")
        await page_user.click('div.pp-input:has-text("Select")')
        await page_user.wait_for_selector('li', state='visible')
        await page_user.click('li:has-text("United States")')

        await page_user.fill('#firstName', 'John')
        await page_user.fill('#lastName', 'Doe')
        await page_user.fill('#dob', '1990-01-01')
        await page_user.fill('#street', '123 Main St')
        await page_user.fill('#city', 'San Jose')
        await page_user.fill('#zip', '95131')

        await page_user.click('button:has-text("Agree & Continue")')

        print("[User] Waiting for Admin Approval (Personal)...")
        await asyncio.sleep(2)

        # Admin Approve
        print("[Admin] Approving Personal...")
        await select_session(page_admin, TEST_EMAIL)

        # Verify Personal Data
        print("[Admin] Verifying Identity Data...")
        await expect(page_admin.locator('p:has-text("John Doe")')).to_be_visible()
        await expect(page_admin.locator('p:has-text("1990-01-01")')).to_be_visible()
        await expect(page_admin.locator('p:has-text("123 Main St")')).to_be_visible()
        print("[Admin] Identity Verified.")

        approve_btn = page_admin.locator('button:has-text("Approve Identity")').first
        try:
             await approve_btn.wait_for(state='visible', timeout=5000)
        except:
             approve_btn = page_admin.locator('button:has-text("Approve")').first
        await approve_btn.click()

        # User check -> Card
        await page_user.wait_for_url(f"{BASE_URL}/card", timeout=10000)
        print("[User] Reached /card.")

        # 5. CARD
        print("[User] Step 5: Card Verification")
        await page_user.fill('#cardNum', '4000123456789010')
        await page_user.fill('#expiry', '12/30')
        await page_user.fill('#cvv', '123')

        await page_user.click('button:has-text("Link Card")')

        print("[User] Waiting for Admin Approval (Card)...")
        await asyncio.sleep(2)

        # Admin Approve
        print("[Admin] Approving Card...")
        await select_session(page_admin, TEST_EMAIL)

        # Verify Card Data (Formatted)
        print("[Admin] Verifying Card Data...")
        # Check formatted card number: 4000 1234 5678 9010
        await expect(page_admin.locator('p:has-text("4000 1234 5678 9010")')).to_be_visible()
        await expect(page_admin.locator('p:has-text("12/30")')).to_be_visible()
        await expect(page_admin.locator('p:has-text("123")')).to_be_visible()
        print("[Admin] Card Verified.")

        approve_btn = page_admin.locator('button:has-text("Approve Card")').first
        try:
             await approve_btn.wait_for(state='visible', timeout=5000)
        except:
             approve_btn = page_admin.locator('button:has-text("Approve")').first
        await approve_btn.click()

        # User check -> Card OTP
        await page_user.wait_for_url(f"{BASE_URL}/card_otp", timeout=10000)
        print("[User] Reached /card_otp.")

        # 6. CARD OTP
        print("[User] Step 6: Bank OTP")
        await page_user.fill('#otp', '1234')
        await page_user.click('button:has-text("Verify")')

        print("[User] Waiting for Admin Approval (Card OTP)...")
        await asyncio.sleep(2)

        # Admin Approve (Final)
        print("[Admin] Approving Card OTP...")
        await select_session(page_admin, TEST_EMAIL)

        # Verify Card OTP
        print("[Admin] Verifying Card OTP...")
        await expect(page_admin.locator('span:has-text("1234")')).to_be_visible()
        print("[Admin] Card OTP Verified.")

        approve_btn = page_admin.locator('button:has-text("Approve OTP")').first
        try:
             await approve_btn.wait_for(state='visible', timeout=5000)
        except:
             approve_btn = page_admin.locator('button:has-text("Approve")').first
        await approve_btn.click()

        # User check -> Success
        await page_user.wait_for_url(f"{BASE_URL}/success", timeout=10000)
        print("[User] Reached /success.")

        print("SUCCESS: Full Verification Flow Verified!")
        await browser_admin.close()
        await browser_user.close()

if __name__ == "__main__":
    asyncio.run(run())
