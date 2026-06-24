'use client';

import { useEffect, useState } from 'react';
import UserPublicBoard from '../../components/UserPublicBoard';
import { getUserIdFromPathname } from '../../lib/user-id';

export default function UserFallbackPage() {
  const [userId, setUserId] = useState('');

  useEffect(() => {
    setUserId(getUserIdFromPathname(window.location.pathname));
  }, []);

  if (!userId) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return <UserPublicBoard handle={userId} />;
}
