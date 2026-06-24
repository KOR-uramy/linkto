import { NextResponse } from 'next/server';
import { incrementLinkClick } from '../../../lib/db/user-repository.js';

export async function POST(request) {
  try {
    const { handle, linkId } = await request.json();

    if (!handle || !linkId) {
      return NextResponse.json({ error: 'handle and linkId are required' }, { status: 400 });
    }

    const clicks = incrementLinkClick(handle, linkId);
    if (clicks === null) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, clicks });
  } catch (error) {
    console.error('Failed to track click:', error);
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
  }
}
