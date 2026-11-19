import { test, expect } from '@playwright/test';
import { createDisposableTestRp } from '../src/server.mjs';

test('virtual passkey registration/assertion and challenge replay rejection', async ({ browser }) => {
  const rp = createDisposableTestRp();
  const origin = await rp.listen();
  const context = await browser.newContext();
  try {
    await context.credentials.install();
    const page = await context.newPage();
    const recorded = {};
    page.on('request', req => {
      if (req.url().endsWith('/api/register/verify') ||
          req.url().endsWith('/api/authenticate/verify')) {
        recorded[new URL(req.url()).pathname] = req.postDataJSON();
      }
    });
    await page.goto(origin);
    await expect(page.getByRole('heading', {
      name: 'Disposable WebAuthn relying party',
    })).toBeVisible();
    await page.getByRole('button', {
      name: 'Register disposable passkey',
    }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Disposable passkey registered and verified.',
    );
    expect(rp.credentialCount).toBe(1);

    // A used challenge must NEVER verify a second response.
    const replayRegistration = await page.evaluate(async (body) => {
      const reply = await fetch('/api/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return reply.status;
    }, recorded['/api/register/verify']);
    expect(replayRegistration).toBe(400);

    await page.getByRole('button', {
      name: 'Authenticate disposable passkey',
    }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Disposable passkey assertion verified.',
    );
    const replayAssertion = await page.evaluate(async (body) => {
      const reply = await fetch('/api/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return reply.status;
    }, recorded['/api/authenticate/verify']);
    expect(replayAssertion).toBe(400);
    expect(rp.credentialCount).toBe(1);
  } finally {
    await context.close();
    await rp.close();
  }
});

test('cross-origin and forged-host ceremonies are refused', async ({ request }) => {
  const rp = createDisposableTestRp();
  const origin = await rp.listen();
  try {
    const blockedOrigin = await request.post(origin + '/api/register/options', {
      data: {},
      headers: { Origin: 'http://evil.example.invalid' },
    });
    expect(blockedOrigin.status()).toBe(403);
    const blockedHost = await request.post(origin + '/api/register/options', {
      data: {},
      headers: {
        Origin: origin,
        Host: 'evil.example.invalid',
      },
    });
    expect(blockedHost.status()).toBe(403);
    const noRegisteredCredential = await request.post(
      origin + '/api/authenticate/options',
      { data: {}, headers: { Origin: origin } },
    );
    expect(noRegisteredCredential.status()).toBe(400);
    expect(rp.credentialCount).toBe(0);
  } finally {
    await rp.close();
  }
});

test('modified authenticator signature is rejected without authorizing future requests',
  async ({ browser }) => {
    const rp = createDisposableTestRp();
    const origin = await rp.listen();
    const context = await browser.newContext();
    try {
      await context.credentials.install();
      const page = await context.newPage();
      await page.goto(origin);
      await page.getByRole('button', {
        name: 'Register disposable passkey',
      }).click();
      await expect(page.getByRole('status')).toHaveText(
        'Disposable passkey registered and verified.',
      );

      await page.route('**/api/authenticate/verify', async route => {
        const body = route.request().postDataJSON();
        const signature = body.response?.response?.signature;
        if (typeof signature !== 'string' || signature.length < 12) {
          throw new Error('Unexpected virtual authenticator format');
        }
        // Intentionally destroy the signed assertion while keeping its
        // original challenge and RP ID unchanged.
        const replacement = signature[0] === 'A' ? 'B' : 'A';
        body.response.response.signature = replacement + signature.slice(1);
        await route.continue({
          postData: JSON.stringify(body),
          headers: {
            ...route.request().headers(),
            'Content-Type': 'application/json',
          },
        });
      });
      await page.getByRole('button', {
        name: 'Authenticate disposable passkey',
      }).click();
      await expect(page.getByRole('status')).toHaveText(
        'Test ceremony rejected or unavailable.',
      );
      await page.unroute('**/api/authenticate/verify');

      await page.getByRole('button', {
        name: 'Authenticate disposable passkey',
      }).click();
      await expect(page.getByRole('status')).toHaveText(
        'Disposable passkey assertion verified.',
      );
    } finally {
      await context.close();
      await rp.close();
    }
});
