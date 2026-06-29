import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('League table width on mobile', async ({ page }) => {
  // We don't have authentication setup in the test, so we might need to mock or navigate
  // Let's just create a dummy HTML to test the table layout with Tailwind classes.
});
