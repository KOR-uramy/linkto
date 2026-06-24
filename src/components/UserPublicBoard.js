'use client';

import '../app/[userId]/page.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Lock, Mail, Globe } from 'lucide-react';
import { apiUrl } from '../lib/api';
import { getStoredUser } from '../lib/auth/google-sign-in';
import { syncUserSlug } from '../lib/user-slug';
import { getAuthHeaders } from '../lib/auth/api-headers';
import { isOwnerOfHandle } from '../lib/auth/owner-check';
import { getStoredCredential } from '../lib/auth/get-stored-credential';

const Youtube = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

const Instagram = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TikTok = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-.7-.52-1.24-1.2-1.63-1.97-.03 2.64.01 5.28-.02 7.92-.12 2.62-1.47 5.17-3.84 6.36-2.28 1.16-5.18.99-7.29-.44-2.11-1.4-3.13-4.14-2.42-6.59.58-2.11 2.4-3.82 4.58-4.17.02 1.48-.01 2.96-.02 4.44-.9-.08-1.89.26-2.46 1-1.01 1.25-.66 3.32.74 4.09 1.24.71 2.97.23 3.65-1.02.24-.46.33-.99.32-1.51V.02z"/>
  </svg>
);

const convertSocialsToArray = (socialsObjOrArr) => {
  if (Array.isArray(socialsObjOrArr)) {
    return socialsObjOrArr.filter(social => !!social.url);
  }
  if (typeof socialsObjOrArr === 'object' && socialsObjOrArr !== null) {
    return Object.entries(socialsObjOrArr)
      .filter(([_, url]) => !!url)
      .map(([platform, url], index) => ({
        id: `social-${platform}-${index}`,
        platform,
        url
      }));
  }
  return [];
};

const getSocialUrl = (platform, url) => {
  if (platform === 'email' && url && !url.startsWith('mailto:')) {
    return `mailto:${url}`;
  }
  return url;
};

const SocialPlatformIcon = ({ platform }) => {
  const size = 20;
  switch (platform) {
    case 'youtube':
      return <Youtube size={size} />;
    case 'instagram':
      return <Instagram size={size} />;
    case 'tiktok':
      return <TikTok style={{ width: '20px', height: '20px', fill: 'var(--text-primary)' }} />;
    case 'email':
      return <Mail size={size} />;
    case 'blog':
    case 'custom':
    default:
      return <Globe size={size} />;
  }
};

const getDomainFromUrl = (url) => {
  try {
    const normalized = url.startsWith('mailto:') ? url : (url.startsWith('http') ? url : `https://${url}`);
    return new URL(normalized).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
};

const getFallbackSocialTitle = (platform, url) => {
  if (platform === 'email') return url.replace(/^mailto:/i, '');

  const ytMatch = url.match(/youtube\.com\/@([^/?]+)/i);
  if (ytMatch) return `@${ytMatch[1]}`;

  const ttMatch = url.match(/tiktok\.com\/@([^/?]+)/i);
  if (ttMatch) return `@${ttMatch[1]}`;

  const igMatch = url.match(/instagram\.com\/([^/?]+)/i);
  if (igMatch && !['p', 'reel', 'stories'].includes(igMatch[1])) return `@${igMatch[1]}`;

  const domain = getDomainFromUrl(url);
  return domain || platform;
};

const cleanSocialTitle = (title) => {
  if (!title) return '';
  return title
    .trim()
    .replace(/\s*-\s*YouTube$/i, '')
    .replace(/\s*•?\s*Instagram photos and videos$/i, '')
    .replace(/\s*\|\s*TikTok$/i, '')
    .replace(/\s*:\s*네이버\s*블로그$/i, '');
};

const SocialLinkButton = ({ platform, url }) => {
  const href = getSocialUrl(platform, url);
  const domain = getDomainFromUrl(url);
  const domainFavicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
  const fallbackTitle = getFallbackSocialTitle(platform, url);

  const [title, setTitle] = useState(fallbackTitle);
  const [iconUrl, setIconUrl] = useState(domainFavicon);
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    setTitle(fallbackTitle);
    setIconUrl(domainFavicon);
    setIconFailed(false);

    if (!url || platform === 'email') return;

    let cancelled = false;

    const loadMeta = async () => {
      try {
        const res = await fetch(apiUrl(`/api/metadata?url=${encodeURIComponent(url)}`));
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const nextTitle = cleanSocialTitle(data.title) || fallbackTitle;
        const nextIcon = data.thumbnailUrl || domainFavicon;

        if (!cancelled) {
          setTitle(nextTitle);
          if (nextIcon) setIconUrl(nextIcon);
        }
      } catch {
        // keep fallback title/icon
      }
    };

    loadMeta();
    return () => { cancelled = true; };
  }, [url, platform, fallbackTitle, domainFavicon]);

  return (
    <a
      href={href}
      className="social-link"
      target="_blank"
      rel="noopener noreferrer"
      title={title}
    >
      {iconUrl && !iconFailed ? (
        <img
          src={iconUrl}
          alt=""
          className="social-link-favicon"
          onError={() => setIconFailed(true)}
        />
      ) : (
        <span className="social-link-fallback-icon">
          <SocialPlatformIcon platform={platform} />
        </span>
      )}
      <span className="social-link-title">{title}</span>
    </a>
  );
};

// Helper to render platform-specific favicon overlay
const PlatformIcon = ({ snsUrl }) => {
  let domain = 'youtube.com';
  try {
    domain = new URL(snsUrl).hostname.replace(/^www\./i, '');
  } catch (e) {}

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <div className="platform-badge-overlay" title={domain}>
      <img 
        src={faviconUrl} 
        alt={domain} 
        style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '3px' }}
        onError={(e) => {
          e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
        }}
      />
    </div>
  );
};

// Helper to render partners link favicon inside button
const LinkFavicon = ({ url }) => {
  let domain = '';
  try {
    domain = new URL(url).hostname.replace(/^www\./i, '');
  } catch (e) {}

  if (!domain) return null;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <img 
      src={faviconUrl} 
      alt={domain} 
      className="btn-favicon"
      onError={(e) => {
        e.target.style.display = 'none'; // hide if fails
      }}
    />
  );
};

export default function UserPublicBoard({ handle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [viewer, setViewer] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const refreshViewer = () => setViewer(getStoredUser());
    refreshViewer();
    window.addEventListener('storage', refreshViewer);
    window.addEventListener('focus', refreshViewer);
    return () => {
      window.removeEventListener('storage', refreshViewer);
      window.removeEventListener('focus', refreshViewer);
    };
  }, []);

  useEffect(() => {
    if (!handle) return;

    const loadUserData = async () => {
      if (handle === 'guest') {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl(`/api/load?handle=${encodeURIComponent(handle)}`));
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [handle]);

  useEffect(() => {
    if (!viewer?.sub || !handle) {
      setIsOwner(false);
      return;
    }

    if (isOwnerOfHandle(viewer, handle)) {
      setIsOwner(true);
      return;
    }

    if (!getStoredCredential()) {
      setIsOwner(false);
      return;
    }

    const verifyOwner = async () => {
      try {
        const res = await fetch(apiUrl('/api/load'), {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          setIsOwner(false);
          return;
        }
        const mine = await res.json();
        if (mine.slug) {
          syncUserSlug(mine.slug, viewer);
          setViewer(getStoredUser());
        }
        setIsOwner(isOwnerOfHandle({ ...viewer, slug: mine.slug }, handle));
      } catch {
        setIsOwner(false);
      }
    };

    verifyOwner();
  }, [viewer, handle]);

  // Dynamic Browser Tab Title and Favicon integration
  useEffect(() => {
    if (!data) return;

    const originalTitle = document.title;
    let originalFaviconHref = '/favicon.ico';
    const faviconLink = document.querySelector("link[rel*='icon']");
    if (faviconLink) {
      originalFaviconHref = faviconLink.getAttribute('href') || '/favicon.ico';
    }

    const profileName = data.profile?.name || 'LinkTo';
    document.title = `${profileName} - 나만의 링크보드 | LinkTo`;

    if (data.profile?.avatar) {
      if (faviconLink) {
        faviconLink.href = data.profile.avatar;
      }
    }

    return () => {
      document.title = originalTitle;
      if (faviconLink) {
        faviconLink.href = originalFaviconHref;
      }
    };
  }, [data]);

  const handleCardClick = async (linkId) => {
    if (!data || !handle) return;

    try {
      const updatedLinks = data.links.map((link) =>
        link.id === linkId ? { ...link, clicks: (link.clicks || 0) + 1 } : link
      );
      setData({ ...data, links: updatedLinks });

      await fetch(apiUrl('/api/track-click'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, linkId }),
      });
    } catch (e) {
      console.error('Failed to log click:', e);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-wrapper fade-in">
        <div className="error-container glass-panel">
          <h1 className="error-title">404</h1>
          <p className="error-desc">존재하지 않거나 비공개 상태인 페이지입니다.</p>
          <Link href="/" className="btn-primary">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const { profile, links } = data;

  const getTimestamp = (id) => {
    if (typeof id === 'string' && id.startsWith('card-')) {
      return parseInt(id.replace('card-', ''), 10) || 0;
    }
    return 0;
  };

  const getSortedLinks = () => {
    const indexed = (links || []).map((link, index) => ({ link, index }));

    if (sortBy === 'registered') {
      // 등록순: oldest registered first
      return indexed
        .sort((a, b) => {
          const tsDiff = getTimestamp(a.link.id) - getTimestamp(b.link.id);
          return tsDiff !== 0 ? tsDiff : a.index - b.index;
        })
        .map(({ link }) => link);
    }
    if (sortBy === 'latest') {
      // 최신순: newest registered first
      return indexed
        .sort((a, b) => {
          const tsDiff = getTimestamp(b.link.id) - getTimestamp(a.link.id);
          return tsDiff !== 0 ? tsDiff : a.index - b.index;
        })
        .map(({ link }) => link);
    }
    if (sortBy === 'popular') {
      // 인기순: 클릭수 내림차순 → 동점 시 등록일 내림차순
      return indexed
        .sort((a, b) => {
          const clickDiff = Number(b.link.clicks || 0) - Number(a.link.clicks || 0);
          if (clickDiff !== 0) return clickDiff;
          const tsDiff = getTimestamp(b.link.id) - getTimestamp(a.link.id);
          return tsDiff !== 0 ? tsDiff : a.index - b.index;
        })
        .map(({ link }) => link);
    }

    return indexed.map(({ link }) => link);
  };

  const sortedLinks = getSortedLinks();

  return (
    <div className="page-wrapper fade-in">
      <main className="bio-container">
        
        {/* Profile Card Header */}
        <header className="profile-card glass-panel">
          <div className="avatar-container">
            {profile?.avatar ? (
              <img src={profile.avatar} className="avatar-img" alt={profile.name || 'User'} />
            ) : (
              <div className="avatar-placeholder">
                {profile?.name ? profile.name[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>
          <div className="profile-name-row">
            <h1 className="profile-name">{profile?.name || 'LinkTo User'}</h1>
            {isOwner && (
              <Link href="/manage" className="manage-btn" title="내 페이지 관리">
                <Lock size={14} />
                <span>관리</span>
              </Link>
            )}
          </div>
          <p className="profile-bio">{profile?.bio || '유튜브 / SNS 영상 링크와 제휴 링크를 모아두는 나만의 링크 보드입니다.'}</p>
          
          <div className="social-links-row">
            {convertSocialsToArray(profile?.socials).map((social) => (
              <SocialLinkButton
                key={social.id}
                platform={social.platform}
                url={social.url}
              />
            ))}
          </div>
        </header>

        {/* Sorting Tabs */}
        {links && links.length > 0 && (
          <div className="sort-tabs-container">
            <button
              type="button"
              className={`sort-tab-btn ${sortBy === 'registered' ? 'active' : ''}`}
              onClick={() => setSortBy('registered')}
            >
              등록순
            </button>
            <button
              type="button"
              className={`sort-tab-btn ${sortBy === 'latest' ? 'active' : ''}`}
              onClick={() => setSortBy('latest')}
            >
              최신순
            </button>
            <button
              type="button"
              className={`sort-tab-btn ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
            >
              인기순
            </button>
          </div>
        )}

        {/* Link Cards Feed */}
        <section className="cards-feed">
          {sortedLinks && sortedLinks.length > 0 ? (
            sortedLinks.map((link) => {
              // Video number should align with the original index from the admin panel (1-based index)
              const registerNum = links.length - links.findIndex(l => l.id === link.id);
              const activePartners = (link.partnersLinks || []).filter((pl) => pl?.url).slice(0, 2);
              const linksCount = activePartners.length > 0
                ? activePartners.length
                : (link.partnersUrl ? 1 : 0);
              
              return (
                <div key={link.id} className="card-item glass-panel">
                  
                  {/* Card Header (Above thumbnail) */}
                  <div className="card-header">
                    <span className="card-num">#{registerNum}</span>
                    <PlatformIcon snsUrl={link.snsUrl} />
                    <span className="card-header-title" title={link.title}>
                      {link.title}
                    </span>
                  </div>

                  {/* Card Thumbnail */}
                  {link.thumbnailUrl && (
                    <a 
                      href={link.snsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="card-thumbnail-link"
                    >
                      <div className="thumbnail-wrapper">
                        <img 
                          src={link.thumbnailUrl} 
                          className="thumbnail-img" 
                          alt="" 
                          loading="lazy" 
                        />
                        <div className="thumbnail-overlay">
                          <span className="overlay-badge">영상 보러가기</span>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Card Details / CTA buttons */}
                  <div className={`card-details ${linksCount === 1 ? 'single-link' : ''}`}>
                    <div className="cta-buttons-container">
                      {activePartners.length > 0 ? (
                        activePartners.map((pl) => (
                          <a 
                            key={pl.url}
                            href={pl.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-primary card-cta"
                            onClick={() => handleCardClick(link.id)}
                          >
                            <LinkFavicon url={pl.url} />
                            <span>{pl.label || '구매 링크'}</span>
                            <ExternalLink size={12} />
                          </a>
                        ))
                      ) : (
                        // Fallback for single-link legacy items
                        link.partnersUrl && (
                          <a 
                            href={link.partnersUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-primary card-cta"
                            onClick={() => handleCardClick(link.id)}
                          >
                            <LinkFavicon url={link.partnersUrl} />
                            <span>{link.ctaText || '최저가 확인하기'}</span>
                            <ExternalLink size={12} />
                          </a>
                        )
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="empty-state glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
              <p>아직 등록된 링크 카드가 없습니다.</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
