'use client';

import './admin.css';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, LogOut, ShieldAlert } from 'lucide-react';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { signInWithGoogleCredential, getStoredUser, signOutUser } from '../../lib/auth/google-sign-in';
import { isDeveloperUser } from '../../config/developer';
import { getPublicAppUrl } from '../../config/app';
import { apiUrl } from '../../lib/api';
import { getPublicPath } from '../../lib/public-url';

export default function DeveloperAdminPage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    document.title = 'LinkTo 개발자 | Admin';
  }, []);

  useEffect(() => {
    try {
      const savedUser = getStoredUser();
      if (savedUser) {
        setUser(savedUser);
      }
    } catch (e) {
      console.error('Failed to load user session', e);
    } finally {
      setAuthReady(true);
    }
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
    setUsers([]);
  };

  const isDeveloper = user ? isDeveloperUser(user) : false;

  useEffect(() => {
    if (!user || !isDeveloper) {
      setUsers([]);
      return;
    }

    const credential = sessionStorage.getItem('linkto_google_credential');
    if (!credential) {
      setLoadError('세션이 만료되었습니다. 다시 로그인해 주세요.');
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      setLoadError('');
      try {
        const res = await fetch(apiUrl('/api/dev/users'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load users');
        }
        setUsers(data.users || []);
      } catch (e) {
        console.error('Failed to load developer users', e);
        setLoadError(e.message || '유저 목록을 불러오지 못했습니다.');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [user, isDeveloper]);

  if (!authReady) {
    return (
      <div className="admin-wrapper">
        <div className="loading-screen">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-wrapper fade-in">
        <header className="admin-header">
          <Link href="/" className="btn-secondary back-btn">
            <ArrowLeft size={16} />
            <span>홈으로</span>
          </Link>
          <div className="title-section">
            <h1 className="admin-title">LinkTo 개발자</h1>
            <p className="admin-subtitle">앱 운영자 전용 공간입니다.</p>
          </div>
        </header>
        <main className="admin-container">
          <section className="login-gate glass-panel">
            <GoogleSignInButton
              containerId="google-signin-btn-dev-admin"
              onCredential={handleCredentialResponse}
            />
          </section>
        </main>
      </div>
    );
  }

  if (!isDeveloper) {
    return (
      <div className="admin-wrapper fade-in">
        <header className="admin-header">
          <Link href="/" className="btn-secondary back-btn">
            <ArrowLeft size={16} />
            <span>홈으로</span>
          </Link>
          <div className="title-section">
            <h1 className="admin-title">LinkTo 개발자</h1>
            <p className="admin-subtitle">접근 권한이 없습니다.</p>
          </div>
        </header>
        <main className="admin-container">
          <section className="form-section glass-panel" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <ShieldAlert size={32} style={{ marginBottom: '12px' }} />
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              이 페이지는 앱 개발자만 사용할 수 있습니다.
            </p>
            <Link href="/manage" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              내 페이지 관리로 이동
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-danger"
              style={{ display: 'block', margin: '16px auto 0' }}
            >
              <LogOut size={14} style={{ marginRight: '4px' }} />
              로그아웃
            </button>
          </section>
        </main>
      </div>
    );
  }

  const appUrl = getPublicAppUrl();

  return (
    <div className="admin-wrapper fade-in">
      <header className="admin-header">
        <Link href="/" className="btn-secondary back-btn">
          <ArrowLeft size={16} />
          <span>홈으로</span>
        </Link>
        <div className="title-section">
          <h1 className="admin-title">LinkTo 개발자</h1>
          <p className="admin-subtitle">{user.email} · 등록 유저 {users.length}명</p>
        </div>
      </header>

      <main className="admin-container">
        <section className="form-section glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>전체 유저</h2>
            <button type="button" onClick={handleLogout} className="btn-danger user-widget-logout-btn">
              <LogOut size={13} style={{ marginRight: '4px' }} />
              로그아웃
            </button>
          </div>

          {loadError && <p className="sync-description" style={{ color: '#c0392b' }}>{loadError}</p>}
          {loadingUsers && <p className="sync-description">불러오는 중...</p>}

          {!loadingUsers && users.length === 0 && !loadError && (
            <p className="sync-description">등록된 유저가 없습니다.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map((entry) => {
              const publicPath = getPublicPath(entry.slug);
              const publicUrl = `${appUrl}${publicPath}`;
              return (
                <div
                  key={entry.id}
                  className="list-item-card glass-panel"
                  style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{entry.name || '이름 없음'}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {entry.slug ? publicUrl : `slug 없음 · ${entry.id}`}
                    </p>
                  </div>
                  {entry.slug && (
                    <Link
                      href={publicPath}
                      className="btn-secondary"
                      target="_blank"
                      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      공개 페이지
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
