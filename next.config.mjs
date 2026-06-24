import { loadGoogleOAuthSecrets } from './scripts/load-google-oauth.mjs';

const google = loadGoogleOAuthSecrets();
const isStaticExport = process.env.BUILD_TARGET === 'static';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport ? { output: 'export', trailingSlash: true, images: { unoptimized: true } } : {}),
  env: {
    ...(google
      ? {
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || google.clientId,
          NEXT_PUBLIC_GOOGLE_CLIENT_ID:
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || google.clientId,
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || google.clientSecret,
        }
      : {}),
    NEXT_PUBLIC_DEVELOPER_EMAILS:
      process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || process.env.DEVELOPER_EMAILS || '',
  },
};

export default nextConfig;
