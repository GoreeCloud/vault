import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { ChallengeLedger } from './ledger.mjs';

const RP_ID = 'localhost';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_STORED_TEST_CREDENTIALS = 16;
const INDEX = await readFile(new URL('./index.html', import.meta.url));
const CLIENT = await readFile(new URL('./client.mjs', import.meta.url));

/**
 * Disposable, loopback-bound WebAuthn relying party for protocol tests only.
 * THIS IS NOT AN AUTHENTICATOR, PASSWORD MANAGER, ACCOUNT SERVICE OR DEPLOYMENT.
 * There is exactly one synthetic test user, no identity proof, no persistence,
 * no shared credentials, no external listener and no secrets sent to logs.
 */
export function createDisposableTestRp({
  now = () => Date.now(),
  challengeTtlMs = 60_000,
} = {}) {
  const ledger = new ChallengeLedger({ clock: now, ttlMs: challengeTtlMs });
  const credentials = new Map();
  const userID = new Uint8Array(randomBytes(32));
  let origin = null;

  function commonHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'publickey-credentials-get=(self)');
    res.setHeader('Content-Security-Policy',
      "default-src 'none'; script-src 'self'; connect-src 'self'; " +
      "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  }

  function json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  }

  async function readJson(req) {
    const type = req.headers['content-type'];
    if (!type || !/^application\/json(?:;|$)/i.test(type)) {
      throw new TypeError('Expected JSON');
    }
    const parts = [];
    let total = 0;
    for await (const part of req) {
      total += part.length;
      if (total > MAX_BODY_BYTES) {
        throw new RangeError('Request too large');
      }
      parts.push(part);
    }
    if (total < 2) throw new TypeError('Missing JSON');
    const decoded = JSON.parse(Buffer.concat(parts, total).toString('utf8'));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      throw new TypeError('Expected JSON object');
    }
    return decoded;
  }

  async function handler(req, res) {
    commonHeaders(res);
    if (origin === null) {
      json(res, 503, { error: 'Test RP has not started' });
      return;
    }
    // Reject DNS rebinding and cross-origin POST. Never emit CORS grants.
    if (req.headers.host !== new URL(origin).host) {
      json(res, 403, { error: 'Untrusted host' });
      return;
    }
    const path = req.url;
    if (req.method === 'GET') {
      if (path === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(INDEX);
        return;
      }
      if (path === '/client.mjs') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        res.end(CLIENT);
        return;
      }
      json(res, 404, { error: 'Not found' });
      return;
    }
    if (req.method !== 'POST' || !path.startsWith('/api/')) {
      json(res, 405, { error: 'Method disallowed' });
      return;
    }
    if (req.headers.origin !== origin) {
      json(res, 403, { error: 'Cross-origin ceremony blocked' });
      return;
    }
    try {
      const body = await readJson(req);
      if (path === '/api/register/options') {
        if (credentials.size >= MAX_STORED_TEST_CREDENTIALS) {
          json(res, 429, { error: 'Disposable credential cap reached' });
          return;
        }
        const options = await generateRegistrationOptions({
          rpName: 'GoreeCloud Vault disposable test RP',
          rpID: RP_ID,
          userName: 'synthetic-test-user@example.invalid',
          userID,
          attestationType: 'none',
          supportedAlgorithmIDs: [-7, -257],
          authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'required',
          },
          excludeCredentials: [...credentials.values()].map(c => ({
            id: c.id,
            transports: c.transports,
          })),
        });
        const requestId = ledger.issue('register', options.challenge);
        json(res, 200, { requestId, options });
        return;
      }
      if (path === '/api/register/verify') {
        const challenge = ledger.take('register', body.requestId);
        if (!challenge || !body.response || typeof body.response !== 'object') {
          json(res, 400, { verified: false });
          return;
        }
        const answer = await verifyRegistrationResponse({
          response: body.response,
          expectedChallenge: challenge,
          expectedOrigin: origin,
          expectedRPID: RP_ID,
          requireUserVerification: true,
        });
        if (!answer.verified || !answer.registrationInfo) {
          json(res, 400, { verified: false });
          return;
        }
        const entry = answer.registrationInfo.credential;
        if (credentials.has(entry.id)) {
          json(res, 409, { verified: false });
          return;
        }
        credentials.set(entry.id, {
          id: entry.id,
          publicKey: entry.publicKey,
          counter: entry.counter,
          transports: entry.transports,
        });
        json(res, 200, { verified: true });
        return;
      }
      if (path === '/api/authenticate/options') {
        if (credentials.size === 0) {
          json(res, 400, { error: 'No disposable credential registered' });
          return;
        }
        const options = await generateAuthenticationOptions({
          rpID: RP_ID,
          userVerification: 'required',
          allowCredentials: [...credentials.values()].map(c => ({
            id: c.id,
            transports: c.transports,
          })),
        });
        const requestId = ledger.issue('authenticate', options.challenge);
        json(res, 200, { requestId, options });
        return;
      }
      if (path === '/api/authenticate/verify') {
        const challenge = ledger.take('authenticate', body.requestId);
        if (!challenge || typeof body.response?.id !== 'string') {
          json(res, 400, { verified: false });
          return;
        }
        const credential = credentials.get(body.response.id);
        if (!credential) {
          json(res, 400, { verified: false });
          return;
        }
        const answer = await verifyAuthenticationResponse({
          response: body.response,
          expectedChallenge: challenge,
          expectedOrigin: origin,
          expectedRPID: RP_ID,
          requireUserVerification: true,
          credential,
        });
        if (!answer.verified) {
          json(res, 400, { verified: false });
          return;
        }
        credential.counter = answer.authenticationInfo.newCounter;
        json(res, 200, { verified: true });
        return;
      }
      json(res, 404, { error: 'Unknown test ceremony' });
    } catch {
      // No challenge material, public keys, user identifiers or bodies in logs.
      json(res, 400, { verified: false });
    }
  }

  const server = createServer((req, res) => { void handler(req, res); });

  async function listen() {
    if (origin !== null) throw new Error('Test RP already started');
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, 'localhost', () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
    origin = 'http://localhost:' + server.address().port;
    return origin;
  }

  async function close() {
    await new Promise((resolve, reject) => server.close(
      err => err ? reject(err) : resolve()));
    origin = null;
    credentials.clear();
    ledger.pending.clear();
  }

  return {
    listen,
    close,
    get origin() { return origin; },
    get credentialCount() { return credentials.size; },
  };
}

// Direct execution provides a test-only localhost listener. No daemon,
// persistence, public network bind or auto-start on library import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const testRp = createDisposableTestRp();
  testRp.listen().then(origin => {
    process.stdout.write('Disposable test RP listening at ' + origin + '\n');
  }).catch(() => process.exitCode = 1);
}
