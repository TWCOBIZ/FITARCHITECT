import { test, expect } from '@playwright/test';

test.describe('Landing Page and Login Flow', () => {
  test('should display landing page and navigate to login', async ({ page }) => {
    await page.goto('/');

    // Try to find the main CTA or login button
    const cta = await page.locator('text=/START YOUR JOURNEY|LOGIN|Sign In/i').first();
    await expect(cta).toBeVisible();
    await cta.click();

    // Assert navigation to login page
    await expect(page).toHaveURL(/login/i);

    // Check for login form fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
}); 