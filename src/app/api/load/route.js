import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const name = searchParams.get('name') || '';
    const picture = searchParams.get('picture') || '';

    let filePath;
    if (!userId || userId === 'guest') {
      // Default fallback to the global links.json
      filePath = path.join(process.cwd(), 'src', 'data', 'links.json');
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
    }

    // Check if user configuration file exists
    if (fs.existsSync(filePath)) {
      const fileData = await fs.promises.readFile(filePath, 'utf-8');
      return NextResponse.json(JSON.parse(fileData));
    }

    // If it doesn't exist, initialize a default configuration
    const defaultData = {
      profile: {
        name: name || "My LinkTo",
        bio: "유튜브 / SNS 영상 링크와 제휴사 링크를 보기 쉽게 모아두는 나만의 링크 보드입니다.",
        avatar: picture || "",
        socials: {
          youtube: "",
          instagram: "",
          tiktok: "",
          blog: "",
          email: ""
        }
      },
      links: []
    };

    // Save default configuration
    await fs.promises.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');

    return NextResponse.json(defaultData);
  } catch (error) {
    console.error('Failed to load user configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration file', details: error.message },
      { status: 500 }
    );
  }
}
