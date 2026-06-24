'use client';

import './page.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Link2, ExternalLink, Copy, Check } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { signInWithGoogleCredential, getStoredUser, signOutUser } from '../lib/auth/google-sign-in';
import { getPublicAppUrl } from '../config/app';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    document.title = "LinkTo - 나만의 링크보드";
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

  const handleMockLogin = async () => {
    const mockUser = {
      sub: 'mock-user-123',
      name: '개발자 테스트',
      email: 'developer@linkto.com',
      picture: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23ffd54f"/><text x="50%" y="55%" font-size="36" font-family="sans-serif" font-weight="bold" fill="%232c2c2c" dominant-baseline="middle" text-anchor="middle">DEV</text></svg>'
    };
    
    localStorage.setItem('linkto_user', JSON.stringify(mockUser));
    setUser(mockUser);
    
    // Pre-create/load profile on backend
    await fetch(`/api/load?userId=${mockUser.sub}&name=${encodeURIComponent(mockUser.name)}&picture=${encodeURIComponent(mockUser.picture)}`);
  };

  const handleLogout = () => {
    signOutUser();
    setUser(null);
  };

  useEffect(() => {
    try {
      const savedUser = getStoredUser();
      if (savedUser) setUser(savedUser);
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
              <div className="art-line">✏️ 유튜브/SNS 링크만 복사 붙여넣기 하면 끝!</div>
              <div className="art-line">🎨 아날로그 드로잉 노트 감성의 미려한 디자인</div>
              <div className="art-line">🔗 나만의 전용 URL (`/[구글유저ID]`) 발급</div>
              <div className="art-line">📈 실시간 클릭수 통계 제공</div>
            </div>

            <div className="login-actions">
              <GoogleSignInButton
                containerId="google-signin-btn-home"
                onCredential={handleCredentialResponse}
              />
              
              {/* Mock Developer Login */}
              <button onClick={handleMockLogin} className="btn-secondary mock-login-btn">
                <span>Mock 계정으로 시작하기 (개발용)</span>
              </button>

              <div className="login-divider">또는</div>

              {/* Guest Access Button */}
              <Link href="/admin" className="btn-primary start-guest-btn">
                <span>로그인 없이 바로 만들기</span>
              </Link>
              
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
              <Link href="/admin" className="btn-primary portal-btn">
                <LayoutDashboard size={18} />
                <span>관리자 대시보드 (편집하기)</span>
              </Link>

              <Link href={`/${user.sub}`} className="btn-secondary portal-btn" target="_blank">
                <Link2 size={18} />
                <span>나의 공개 링크 페이지 보기</span>
                <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
              </Link>
              
              <div className="user-url-display" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="url-label">내 링크 주소:</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <code className="url-code" style={{ flex: 1 }}>{`${getPublicAppUrl()}/${user.sub}`}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${getPublicAppUrl()}/${user.sub}`);
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
