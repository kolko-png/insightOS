import type { NextConfig } from 'next';

/**
 * serverExternalPackages: snowflake-sdk ships native bindings and
 * CJS-style requires that don't survive webpack bundling cleanly —
 * without this, `next build` either fails or silently produces a
 * broken bundle that only breaks at runtime on first Snowflake call.
 * This is the Next.js 15 config key; it replaced
 * experimental.serverComponentsExternalPackages in earlier versions
 * — worth double-checking against the installed Next.js version's
 * changelog if this ever throws an "unrecognized key" warning.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ['snowflake-sdk'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default nextConfig;
