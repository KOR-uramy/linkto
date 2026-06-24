'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAuthenticatedProfile } from '../lib/user-profile-client';
import {
  getPublicLinkInfo,
  isAuthExpiredStatus,
  seedSlugFromUser,
  syncUserSlug,
} from '../lib/user-slug';

/**
 * 로그인 사용자의 공개 slug·URL을 한곳에서 관리합니다.
 * @param {object|null} user - getStoredUser / signIn 결과
 * @param {{ syncFromApi?: boolean, onAuthExpired?: () => void }} options
 */
export function useUserSlug(user, { syncFromApi = false, onAuthExpired } = {}) {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (!user?.sub) {
      setSlug('');
      return;
    }
    const seeded = seedSlugFromUser(user);
    if (seeded) {
      setSlug(seeded);
    }
  }, [user?.sub]);

  const applyFromServer = useCallback(
    (serverSlug) => {
      const nextSlug = syncUserSlug(serverSlug, user);
      setSlug(nextSlug);
      return nextSlug;
    },
    [user]
  );

  const clearSlug = useCallback(() => setSlug(''), []);

  useEffect(() => {
    if (!syncFromApi || !user?.sub) {
      return undefined;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const result = await fetchAuthenticatedProfile({ signal: controller.signal });
        if (result.ok) {
          applyFromServer(result.data?.slug);
        } else if (isAuthExpiredStatus(result.status)) {
          onAuthExpired?.();
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to sync public slug from server', error);
        }
      }
    })();

    return () => controller.abort();
  }, [user?.sub, syncFromApi, applyFromServer, onAuthExpired]);

  const { effectiveSlug, publicPath, publicUrl } = useMemo(
    () => getPublicLinkInfo(slug, user),
    [slug, user]
  );

  return {
    slug,
    setSlug,
    applyFromServer,
    clearSlug,
    effectiveSlug,
    publicPath,
    publicUrl,
  };
}
