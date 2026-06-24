import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const payload = await request.json();
    const { userId, data } = payload;

    // Basic format validation
    if (!data || !data.profile || !data.links) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    let filePath;
    let message;
    if (!userId || userId === 'guest') {
       // Default fallback to global links.json
      filePath = path.join(process.cwd(), 'src', 'data', 'links.json');
      message = 'Saved successfully to global links.json';
    } else {
      // Clean userId to prevent path traversal
      const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!cleanUserId) {
        return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
      }
      const userDir = path.join(process.cwd(), 'src', 'data', 'users');
      filePath = path.join(userDir, `${cleanUserId}.json`);

      // Ensure directory exists
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      message = `Saved successfully to users/${cleanUserId}.json`;
    }

    // Write file to the local directory
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Failed to save links configuration:', error);
    return NextResponse.json(
      { error: 'Failed to write configuration file locally', details: error.message },
      { status: 500 }
    );
  }
}
