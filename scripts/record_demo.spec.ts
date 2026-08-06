import { test, expect } from '@playwright/test';

test('record end-to-end alertix demo', async ({ page, request }) => {
  // Go to the dashboard
  await page.goto('http://localhost:3000/dashboard');
  
  // Wait a moment to show the clean state
  await page.waitForTimeout(2000);
  
  // 1. Reset demo state
  console.log("Resetting demo...");
  await request.post('http://localhost:8000/reset');
  await page.waitForTimeout(3000);

  // 2. Baseline login
  console.log("Simulating baseline login...");
  await request.post('http://localhost:8000/simulate', {
    data: { scenario: 'normal' }
  });
  await page.waitForTimeout(5000);
  
  // 3. Anomalous login
  console.log("Simulating impossible travel...");
  await request.post('http://localhost:8000/simulate', {
    data: { scenario: 'impossible_travel' }
  });
  await page.waitForTimeout(5000);

  // 4. Post-login privilege misuse (same session)
  console.log("Simulating insider threat...");
  await request.post('http://localhost:8000/simulate', {
    data: { scenario: 'insider_threat' }
  });
  await page.waitForTimeout(5000);

  // 5. KYC fraud
  console.log("Simulating KYC fraud...");
  await request.post('http://localhost:8000/simulate', {
    data: { scenario: 'kyc_fraud' }
  });
  await page.waitForTimeout(5000);

  // 6. Check audit trail
  console.log("Navigating to audit trail...");
  await page.goto('http://localhost:3000/privacy-audit');
  await page.waitForTimeout(6000);
});
