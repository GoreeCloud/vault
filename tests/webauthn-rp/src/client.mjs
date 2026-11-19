'use strict';

// No third-party browser JS, global passkey interception, extensions or
// persistent credential storage. The actual authenticator is the browser/OS
// (virtual in our automated tests), not GoreeCloud Vault.
const output = document.querySelector('#status');
const register = document.querySelector('#register');
const authenticate = document.querySelector('#authenticate');

async function send(path, value) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Test ceremony failed at ' + path);
  return res.json();
}

async function withUI(message, operation) {
  register.disabled = true;
  authenticate.disabled = true;
  output.textContent = message;
  try {
    await operation();
  } catch {
    output.textContent = 'Test ceremony rejected or unavailable.';
  } finally {
    register.disabled = false;
    authenticate.disabled = false;
  }
}

register.addEventListener('click', () => {
  void withUI('Registering a disposable authenticator…', async () => {
    const { requestId, options } = await send('/api/register/options', {});
    if (typeof PublicKeyCredential.parseCreationOptionsFromJSON !== 'function') {
      throw new Error('Browser lacks modern WebAuthn JSON options support');
    }
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(options);
    const created = await navigator.credentials.create({ publicKey });
    if (!(created instanceof PublicKeyCredential) ||
        typeof created.toJSON !== 'function') {
      throw new Error('Missing WebAuthn registration response');
    }
    const verified = await send('/api/register/verify', {
      requestId,
      response: created.toJSON(),
    });
    if (verified.verified !== true) throw new Error('Registration refused');
    output.textContent = 'Disposable passkey registered and verified.';
  });
});

authenticate.addEventListener('click', () => {
  void withUI('Requesting a signed assertion…', async () => {
    const { requestId, options } = await send('/api/authenticate/options', {});
    if (typeof PublicKeyCredential.parseRequestOptionsFromJSON !== 'function') {
      throw new Error('Browser lacks modern WebAuthn JSON options support');
    }
    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(options);
    const signed = await navigator.credentials.get({ publicKey });
    if (!(signed instanceof PublicKeyCredential) ||
        typeof signed.toJSON !== 'function') {
      throw new Error('Missing WebAuthn assertion response');
    }
    const verified = await send('/api/authenticate/verify', {
      requestId,
      response: signed.toJSON(),
    });
    if (verified.verified !== true) throw new Error('Assertion refused');
    output.textContent = 'Disposable passkey assertion verified.';
  });
});
