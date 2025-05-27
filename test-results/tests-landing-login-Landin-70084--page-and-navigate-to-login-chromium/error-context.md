# Test info

- Name: Landing Page and Login Flow >> should display landing page and navigate to login
- Location: /Users/kenanthony/Desktop/FITARCHITECT/tests/landing-login.spec.ts:4:3

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('text=/START YOUR JOURNEY|LOGIN|Sign In/i').first()
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('text=/START YOUR JOURNEY|LOGIN|Sign In/i').first()

    at /Users/kenanthony/Desktop/FITARCHITECT/tests/landing-login.spec.ts:9:23
```

# Page snapshot

```yaml
- img "Fit Architect Background"
- heading "FIT ARCHITECT" [level=1]
- paragraph: DISCIPLINE IS THE BLUEPRINT
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Landing Page and Login Flow', () => {
   4 |   test('should display landing page and navigate to login', async ({ page }) => {
   5 |     await page.goto('/');
   6 |
   7 |     // Try to find the main CTA or login button
   8 |     const cta = await page.locator('text=/START YOUR JOURNEY|LOGIN|Sign In/i').first();
>  9 |     await expect(cta).toBeVisible();
     |                       ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  10 |     await cta.click();
  11 |
  12 |     // Assert navigation to login page
  13 |     await expect(page).toHaveURL(/login/i);
  14 |
  15 |     // Check for login form fields
  16 |     await expect(page.locator('input[type="email"]')).toBeVisible();
  17 |     await expect(page.locator('input[type="password"]')).toBeVisible();
  18 |   });
  19 | }); 
```