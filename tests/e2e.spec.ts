import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test('SüperBET v2 E2E user flow with auto-confirmed user', async ({ page }) => {
  const timestamp = Date.now();
  const testUser = `pwtest${timestamp}`;
  const tempPass = 'Password123!';
  const newPass = 'NewPassword123!';

  // 1. Pre-create the user via admin script (bypasses GoTrue registration restrictions & auto-confirms email)
  console.log(`Pre-creating user ${testUser} via admin script...`);
  try {
    execSync(`node scripts/admin.js create ${testUser} ${tempPass}`, {
      cwd: process.cwd(),
      env: process.env,
    });
    console.log(`User ${testUser} successfully created.`);
  } catch (error) {
    const errorObj = error as Error;
    console.error('Failed to pre-create user:', errorObj.message);
    throw error;
  }

  // Go to login page
  await page.goto('/');

  // Verify login view is loaded
  await expect(page.locator('text=Anmelden')).toBeVisible();

  // 2. Click invite flow link
  await page.click('text=Mit Einladungscode beitreten');
  await expect(page.locator('text=Code eingeben')).toBeVisible();

  // 3. Fill invite code for Test-Liga (LIG-TEST12)
  await page.fill('input[placeholder="LIG-XXXXXX"]', 'LIG-TEST12');
  await page.click('button[type="submit"]');

  // 4. Choice screen: choose "Ja, einloggen & beitreten"
  await expect(page.locator('text=Ja, einloggen & beitreten')).toBeVisible();
  await page.click('text=Ja, einloggen & beitreten');

  // 5. Fill credentials & Login
  await page.fill('input[placeholder="dein_username"]', testUser);
  await page.fill('input[placeholder="••••••"]', tempPass);
  await page.click('button[type="submit"]');

  // 6. Set new password screen (forced on first login)
  await expect(page.locator('text=Neues Passwort').first()).toBeVisible();
  await page.fill('input[placeholder="••••••"] >> nth=0', newPass);
  await page.fill('input[placeholder="••••••"] >> nth=1', newPass);
  await page.click('button:has-text("Passwort speichern")');

  // 7. Onboarding Carousel (should pop up on landing on dashboard)
  // Slide 0: Click "Weiter"
  await expect(page.locator('text=Sali Abi, willkommen bei SÜPERBET!').first()).toBeVisible();
  await page.click('text=Weiter');

  // Slide 1: Click "Weiter"
  await expect(page.locator('text=Der Ehren-Punkteschlüssel').first()).toBeVisible();
  await page.click('text=Weiter');

  // Slide 2: Click "Weiter"
  await expect(page.locator('text=Level Up & Status').first()).toBeVisible();
  await page.click('text=Weiter');

  // Slide 3: Click "Bruder, let's go! 🚀"
  await expect(page.locator('text=Bist du bereit, Bruder?').first()).toBeVisible();
  await page.click('text="Bruder, let\'s go! 🚀"');

  // 8. Land on games dashboard
  await expect(page.locator('text=Spiele').first()).toBeVisible();

  // 9. Click Profile tab
  const profilBtn = page.locator('text=Profil').first();
  await profilBtn.click();

  // 10. Verify profile modular subcomponents are visible
  await expect(page.locator('text=Liga-Fortschritt')).toBeVisible();
  await expect(page.locator('text=Meine Erfolge')).toBeVisible();
  await expect(page.locator('text=Ehren-Ränge & Level-Übersicht')).toBeVisible();

  // 11. Logout
  await page.click('text="Abmelden (Logout)"');
  await expect(page.locator('text=Anmelden')).toBeVisible();
});
