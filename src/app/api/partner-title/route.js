import { NextResponse } from 'next/server';
import { fetchPartnerLinkTitle } from '../../../lib/fetch-partner-link-title.js';
import { getPartnerLinkUrlFallback } from '../../../lib/partner-link-label.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  let cleanUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  try {
    const title = await fetchPartnerLinkTitle(cleanUrl);
    return NextResponse.json({ title: title || getPartnerLinkUrlFallback(cleanUrl), url: cleanUrl });
  } catch (error) {
    console.error('Failed to fetch partner link title:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner link title', details: error.message },
      { status: 500 }
    );
  }
}
