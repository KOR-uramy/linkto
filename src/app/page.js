'use client';

import './page.css';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Link2, ExternalLink, Copy, Check } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { signInWithGoogleCredential, getStoredUser, signOutUser } from '../lib/auth/google-sign-in';
import { useUserSlug } from '../hooks/use-user-slug';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);

  const handleAuthExpired = useCallback(() => {
    signOutUser();
    setUser(null);
  }, []);

  const { effectiveSlug, publicPath, publicUrl } = useUserSlug(user, {
    syncFromApi: true,
    onAuthExpired: handleAuthExpired,
  });

  useEffect(() => {
    document.title = 'LinkTo - 나만의 링크보드';
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const userData = await signInWithGoogleCredential(response.credential);
      setUser(userData);
    } catch (e) {
      console.error('Failed to handle Google login response:', e);
      alert('구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleLogout = () => {
    signOutUser();
    setUser(null);
  };

  useEffect(() => {
    try {
      const savedUser = getStoredUser();
      if (savedUser) {
        setUser(savedUser);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="landing-wrapper fade-in">
      <main className="landing-container glass-panel">
        <header className="landing-header">
          <h1 className="landing-logo">LinkTo</h1>
          <p className="landing-tagline">유튜브/SNS 영상 및 제휴 링크를 손쉽게 모으는 나만의 링크 보드</p>
        </header>

        {!user ? (
          <div className="auth-section">
            <div className="sketch-notebook-art">
              <div className="art-line">✏️ 유튜브·인스타그램·틱톡 링크만 복사 붙여넣기 하면 끝!</div>
              <div className="art-line">🎨 아날로그 드로잉 노트 감성의 미려한 디자인</div>
              <div className="art-line">🔗 나만의 전용 URL 발급</div>
              <div className="art-line">📈 실시간 클릭수 통계 제공</div>
            </div>

            <div className="login-actions">
              <GoogleSignInButton
                containerId="google-signin-btn-home"
                onCredential={handleCredentialResponse}
              />

              <p className="login-notice">
                * 구글 로그인 시 고유 유저 ID 기반의 개인화 주소가 즉시 생성됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="portal-section">
            <div className="user-profile-box">
              {user.picture ? (
                <img src={user.picture} alt="" className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder">
                  {user.name ? user.name[0] : 'U'}
                </div>
              )}
              <h2 className="user-welcome">안녕하세요, {user.name}님!</h2>
              <p className="user-email">{user.email}</p>
            </div>

            <div className="portal-actions">
              <Link href="/manage" className="btn-primary portal-btn">
                <LayoutDashboard size={18} />
                <span>내 페이지 관리 (편집하기)</span>
              </Link>

              <Link
                href={publicPath}
                className="btn-secondary portal-btn portal-btn--view"
                target="_blank"
                aria-disabled={!effectiveSlug}
                style={!effectiveSlug ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
              >
                <Link2 size={18} />
                <span>나의 공개 링크 페이지 보기</span>
                <ExternalLink size={14} />
              </Link>

              <div className="user-url-display" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="url-label">내 링크 주소:</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <code className="url-code" style={{ flex: 1 }}>{publicUrl}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      setUrlCopied(true);
                      setTimeout(() => setUrlCopied(false), 2000);
                    }}
                    className="action-icon-btn"
                    style={{ width: '32px', height: '32px', border: '1.5px solid var(--stroke-color)', flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'transparent', borderRadius: '8px' }}
                    title="주소 복사"
                  >
                    {urlCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <button onClick={handleLogout} className="btn-danger portal-logout-btn">
                <LogOut size={16} />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
