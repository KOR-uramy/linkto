import path from 'path';

export const DB_PATH =
  process.env.LINKTO_DB_PATH || path.join(process.cwd(), 'data', 'linkto.db');

export const DEFAULT_PROFILE = {
  name: 'My LinkTo',
  bio: '유튜브 / SNS 영상 링크와 제휴사 링크를 보기 쉽게 모아두는 나만의 링크 보드입니다.',
  avatar: '',
  socials: [],
};
