import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Snowflake's key-pair JWT scheme for REST APIs (Cortex Inference,
 * Cortex Search query endpoint, SQL API). This is a DIFFERENT auth
 * surface from lib/snowflake/client.ts and admin.ts, which
 * authenticate at the driver level via snowflake-sdk — the Cortex
 * REST endpoints are plain HTTPS and need their own bearer token,
 * built from the same private key.
 *
 * VERIFY BEFORE PRODUCTION (Phase 8): the issuer/subject claim
 * format below matches Snowflake's documented key-pair JWT spec as
 * of my knowledge cutoff. Snowflake has revised REST API details
 * before — confirm against current docs for the Cortex Inference
 * API specifically before relying on this against a live account.
 */
export function getCortexJwt(): string {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const account = process.env.SNOWFLAKE_ACCOUNT!.toUpperCase();
  const user = process.env.SNOWFLAKE_APP_RUNTIME_USER!.toUpperCase();
  const privateKey = fs.readFileSync(process.env.SNOWFLAKE_PRIVATE_KEY_PATH!, 'utf8');

  const publicKey = crypto.createPublicKey(privateKey);
  const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
  const fingerprint = crypto.createHash('sha256').update(publicKeyDer).digest('base64');

  const qualifiedUsername = `${account}.${user}`;
  const issuer = `${qualifiedUsername}.SHA256:${fingerprint}`;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 55 * 60; // refresh well before Snowflake's ~1hr JWT ceiling

  const token = jwt.sign(
    { iss: issuer, sub: qualifiedUsername, iat: now, exp: expiresAt },
    privateKey,
    { algorithm: 'RS256' }
  );

  cachedToken = { token, expiresAt: expiresAt * 1000 };
  return token;
}
