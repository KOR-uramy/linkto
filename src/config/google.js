export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';

export const GOOGLE_CLIENT_ID_SERVER =
  process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const isGoogleLoginConfigured = () => Boolean(GOOGLE_CLIENT_ID);
