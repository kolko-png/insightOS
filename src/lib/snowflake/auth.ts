import 'server-only';
import { getCortexJwt } from './jwt';

/**
 * PHASE 8 CORRECTION: verified against current Snowflake docs
 * (Authenticating Snowflake REST APIs, and the Cortex REST API
 * quick-start examples). Snowflake's own guidance is explicit:
 * "PAT provides the fastest path to a working call... no
 * cryptography, no browser" — versus key-pair JWT, which needs a
 * key pair, fingerprint computation, and RS256 signing (jwt.ts).
 *
 * For a hackathon build, PAT is the right default: one token
 * generated in Snowsight (Profile → Programmatic Access Tokens),
 * set as SNOWFLAKE_PAT, done. The trade-off, stated plainly: PATs
 * expire (15 days by default, extendable via an authentication
 * policy up to a configured max) and need manual or scripted
 * rotation, whereas the JWT path is self-renewing as long as the
 * private key is available. If this goes from hackathon demo to a
 * long-lived production deployment, switch getCortexAuthHeaders()
 * to prefer the JWT path (already implemented in jwt.ts) or move to
 * Workload Identity Federation, which needs no stored credential at
 * all. Both paths hit the identical REST endpoints — swapping is a
 * one-function change, not a rearchitecture.
 */
export function getCortexAuthHeaders(): Record<string, string> {
  const pat = process.env.SNOWFLAKE_PAT;

  if (pat) {
    return { Authorization: `Bearer ${pat}` };
  }

  return {
    Authorization: `Bearer ${getCortexJwt()}`,
    'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
  };
}
