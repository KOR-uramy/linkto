'use client';

import './admin.css';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Copy, 
  Check, 
  RefreshCw,
  Eye,
  Info,
  ExternalLink,
  LogOut,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import initialData from '../../data/links.json';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { signInWithGoogleCredential, getStoredUser, signOutUser } from '../../lib/auth/google-sign-in';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
    profile: { name: '', bio: '', avatar: '', socials: [] },
    links: []
  });
  const [snsUrl, setSnsUrl] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  const handleCredentialResponse = async (response) => {
    try {
      const userData = await signInWithGoogleCredential(response.credential);
      setUser(userData);
    } catch (e) {
      console.error('Failed to handle Google login response:', e);
      alert('구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  useEffect(() => {
    document.title = "LinkTo 관리자 대시보드";
  }, []);

  // Normalize socials to array format (supports legacy object storage)
  const normalizeSocials = (socials) => {
    if (Array.isArray(socials)) {
      return socials.map((s, index) => ({
        id: s.id || `social-${index}-${Date.now()}`,
        platform: s.platform || 'custom',
        url: s.url || '',
      }));
    }
    if (typeof socials === 'object' && socials !== null) {
      return Object.entries(socials)
        .filter(([_, url]) => !!url)
        .map(([platform, url], index) => ({
          id: `social-${platform}-${index}`,
          platform,
          url,
        }));
    }
    return [];
  };

  // Helper to ensure structure is safe
  const ensureProfileStructure = (loadedData) => {
    return {
      profile: {
        name: loadedData?.profile?.name || '',
        bio: loadedData?.profile?.bio || '',
        avatar: loadedData?.profile?.avatar || '',
        socials: normalizeSocials(loadedData?.profile?.socials),
      },
      links: loadedData?.links || []
    };
  };

  // 1. User Session & Data Fetching
  useEffect(() => {
    let loggedInUser = null;
    try {
      loggedInUser = getStoredUser();
      if (loggedInUser) setUser(loggedInUser);
    } catch (e) {
      console.error('Failed to load user session', e);
    }

    const fetchData = async () => {
      try {
        const url = loggedInUser ? `/api/load?userId=${loggedInUser.sub}` : '/api/load';
        const res = await fetch(url);
        if (res.ok) {
          const serverData = await res.json();
          
          if (!loggedInUser) {
            // Guest Mode: load localStorage first if exists
            const storedData = localStorage.getItem('linkto_data');
            if (storedData) {
              setData(ensureProfileStructure(JSON.parse(storedData)));
            } else {
              setData(ensureProfileStructure(serverData));
            }
          } else {
            setData(ensureProfileStructure(serverData));
          }
        } else {
          // Fallback to initial local assets
          setData(ensureProfileStructure(initialData));
        }
      } catch (e) {
        console.error('Failed to load data', e);
        setData(ensureProfileStructure(initialData));
      }
    };

    fetchData();
  }, [user?.sub]);

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

  // 3. Save changes helper
  const saveData = async (updatedData) => {
    const normalized = {
      ...updatedData,
      profile: {
        ...updatedData.profile,
        socials: normalizeSocials(updatedData.profile?.socials),
      },
    };
    setData(normalized);

    if (!user) {
      localStorage.setItem('linkto_data', JSON.stringify(normalized));
    }

    setSaveStatus('저장 중...');
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user ? user.sub : 'guest',
          data: normalized
        })
      });
      
      if (res.ok) {
        setSaveStatus(user ? '서버에 저장 완료!' : '로컬 디스크에 저장 완료!');
      } else {
        setSaveStatus('브라우저에 임시 저장됨 (서버 저장 실패)');
      }
    } catch (e) {
      setSaveStatus('브라우저에 임시 저장됨 (네트워크 오류)');
      console.error('Local file write failed, falling back to localStorage', e);
    }

    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Detect links from SNS URL and show preview
  const handleDetectLinks = async (e) => {
    e.preventDefault();
    if (!snsUrl) return;

    setIsDetecting(true);
    setPendingCard(null);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(snsUrl)}`);
      if (res.ok) {
        const metadata = await res.json();

        let detectedLinks = [];
        if (metadata.detectedLinks?.length > 0) {
          detectedLinks = metadata.detectedLinks.map((item) => ({
            url: item.url,
            label: item.label || '구매 링크',
          }));
        } else if (metadata.partnersUrl) {
          let label = '링크';
          try {
            label = new URL(metadata.partnersUrl).hostname.toLowerCase().replace(/^www\./i, '');
          } catch (err) {}
          detectedLinks = [{ url: metadata.partnersUrl, label }];
        }

        setPendingCard({
          title: metadata.title || '영상 링크',
          snsUrl,
          thumbnailUrl: metadata.thumbnailUrl || '',
          platform: metadata.platform || 'general',
          partnersLinks: detectedLinks,
        });
      } else {
        alert('영상 정보를 불러오는 데 실패했습니다.');
      }
    } catch (err) {
      console.error('Error detecting links:', err);
      alert('링크 감지 중 오류가 발생했습니다.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleRemovePendingLink = (index) => {
    setPendingCard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        partnersLinks: prev.partnersLinks.filter((_, i) => i !== index),
      };
    });
  };

  const handleCancelPending = () => {
    setPendingCard(null);
  };

  const handleConfirmAddCard = async () => {
    if (!pendingCard) return;

    setIsAdding(true);
    try {
      const newCard = {
        id: 'card-' + Date.now(),
        title: pendingCard.title,
        snsUrl: pendingCard.snsUrl,
        partnersLinks: pendingCard.partnersLinks.slice(0, 2),
        thumbnailUrl: pendingCard.thumbnailUrl,
        platform: pendingCard.platform,
        clicks: 0,
      };

      const updatedData = {
        ...data,
        links: [newCard, ...data.links],
      };

      await saveData(updatedData);
      setSnsUrl('');
      setPendingCard(null);
    } catch (err) {
      console.error('Error adding card:', err);
      alert('카드 추가 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemovePartnerLink = (linkId, partnerIndex) => {
    const updatedLinks = data.links.map((link) => {
      if (link.id !== linkId) return link;
      const nextPartners = (link.partnersLinks || []).filter((_, i) => i !== partnerIndex);
      return { ...link, partnersLinks: nextPartners };
    });
    saveData({ ...data, links: updatedLinks });
  };

  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname.replace(/^www\./i, '');
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  };

  // Delete a card
  const handleDeleteCard = (id) => {
    if (!confirm('정말 이 카드를 삭제하시겠습니까?')) return;
    const updatedLinks = data.links.filter(link => link.id !== id);
    saveData({ ...data, links: updatedLinks });
  };

  // Move card position (reorder)
  const moveCard = (index, direction) => {
    const newLinks = [...data.links];
    const targetIndex = index + direction;
    
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;
    
    // Swap elements
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;
    
    saveData({ ...data, links: newLinks });
  };

  // Copy JSON configuration
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download links.json file
  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "links.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Reset local storage cache to disk defaults
  const handleResetToDefault = () => {
    if (confirm('모든 데이터를 초기 상태로 복원하시겠습니까? (로컬 브라우저 캐시가 비워지고 JSON 기본 설정값으로 복원됩니다)')) {
      localStorage.removeItem('linkto_data');
      setData(ensureProfileStructure(initialData));
      setSaveStatus('초기 데이터로 복원 완료!');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Dynamic SNS Channels Management Helpers
  const detectPlatformFromUrl = (url) => {
    if (!url) return 'custom';
    if (/^mailto:/i.test(url) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return 'email';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/instagram\.com/i.test(url)) return 'instagram';
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/blog\.naver\.com|tistory\.com|medium\.com/i.test(url)) return 'blog';
    return 'custom';
  };

  const socialsList = normalizeSocials(data.profile?.socials);

  const handleAddChannel = () => {
    const newChannel = {
      id: 'social-' + Date.now(),
      platform: 'custom',
      url: ''
    };
    const updated = {
      ...data,
      profile: {
        ...data.profile,
        socials: [...socialsList, newChannel]
      }
    };
    saveData(updated);
  };

  const handleUpdateChannel = (id, field, value) => {
    const updatedSocials = socialsList.map(social => {
      if (social.id === id) {
        const next = { ...social, [field]: value };
        if (field === 'url') next.platform = detectPlatformFromUrl(value);
        return next;
      }
      return social;
    });
    const updated = {
      ...data,
      profile: {
        ...data.profile,
        socials: updatedSocials
      }
    };
    setData(updated);
  };

  const handleRemoveChannel = (id) => {
    const updatedSocials = socialsList.filter(social => social.id !== id);
    const updated = {
      ...data,
      profile: {
        ...data.profile,
        socials: updatedSocials
      }
    };
    saveData(updated);
  };

  const handleMoveChannel = (index, direction) => {
    const newSocials = [...socialsList];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSocials.length) return;

    const temp = newSocials[index];
    newSocials[index] = newSocials[targetIndex];
    newSocials[targetIndex] = temp;

    const updated = {
      ...data,
      profile: {
        ...data.profile,
        socials: newSocials
      }
    };
    saveData(updated);
  };

  return (
    <div className="admin-wrapper fade-in">
      <header className="admin-header">
        <Link href={user ? `/${user.sub}` : '/guest'} className="btn-secondary back-btn" target={user ? "_blank" : undefined}>
          <ArrowLeft size={16} />
          <span>페이지 보기</span>
        </Link>
        <div className="title-section">
          <h1 className="admin-title">LinkTo 관리</h1>
          <p className="admin-subtitle">유튜브/SNS 링크만 넣으면 카드가 알아서 생성됩니다.</p>
        </div>
      </header>

      <main className="admin-container">
        
        {/* User login state widgets */}
        {!user ? (
          <div className="guest-banner">
            <p className="guest-banner-text">
              💡 현재 <strong>로그인하지 않은 상태(게스트 모드)</strong>로 만들고 있습니다. 작성하신 카드는 브라우저에 임시로 저장되며, 구글 로그인 시 평생 나만의 전용 URL(<code>/[구글유저ID]</code>)을 발급받아 안전하게 서버에 저장할 수 있습니다.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', borderTop: '1px dashed var(--stroke-color)', paddingTop: '10px', marginTop: '-6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 'bold' }}>임시 주소:</span>
              <code style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>http://localhost:3000/guest</code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('http://localhost:3000/guest');
                  setUrlCopied(true);
                  setTimeout(() => setUrlCopied(false), 2000);
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: 'var(--text-secondary)' }}
                title="임시 주소 복사"
              >
                {urlCopied ? <Check size={12} style={{ color: 'green' }} /> : <Copy size={12} />}
              </button>
            </div>

            <div className="guest-banner-actions">
              <GoogleSignInButton
                containerId="google-signin-btn-admin"
                onCredential={handleCredentialResponse}
                className="btn-secondary google-signin-sketch-btn google-signin-sketch-btn--compact"
                label="Google 로그인"
                size="medium"
              />
              <span className="divider-text">또는</span>
              <button onClick={handleMockLogin} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px' }}>
                Mock 계정 로그인
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`user-profile-widget ${showProfilePanel ? 'is-open' : ''}`}
            onClick={() => setShowProfilePanel((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowProfilePanel((prev) => !prev);
              }
            }}
            aria-expanded={showProfilePanel}
            aria-label="프로필 및 SNS 채널 설정 열기"
          >
            <div className="user-widget-main">
              {user.picture ? (
                <img src={user.picture} alt="" className="user-widget-avatar" />
              ) : (
                <div className="user-widget-avatar-placeholder">
                  {user.name ? user.name[0] : 'U'}
                </div>
              )}
              <div className="user-widget-info">
                <h3 className="user-widget-name">{user.name}님 관리 모드</h3>
                <p className="user-widget-hint">
                  {showProfilePanel ? '프로필 · SNS 설정 접기' : '프로필 · SNS 설정 펼치기'}
                </p>
                <div className="user-widget-links" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/${user.sub}`} className="user-widget-link-btn" target="_blank" style={{ fontSize: '13px' }}>
                    내 페이지 보기 <ExternalLink size={11} style={{ marginLeft: '1px' }} />
                  </Link>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.04)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>
                      {`http://localhost:3000/${user.sub}`}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`http://localhost:3000/${user.sub}`);
                        setUrlCopied(true);
                        setTimeout(() => setUrlCopied(false), 2000);
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: 'var(--text-secondary)' }}
                      title="주소 복사"
                    >
                      {urlCopied ? <Check size={12} style={{ color: 'green' }} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="user-widget-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={handleLogout} className="btn-danger user-widget-logout-btn">
                  <LogOut size={13} style={{ marginRight: '4px' }} />
                  로그아웃
                </button>
              </div>
            </div>
            <span className="user-widget-chevron" aria-hidden="true">
              {showProfilePanel ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </div>
        )}

        {/* Status notification */}
        {saveStatus && (
          <div className="save-status-toast glass-panel">
            <Check size={16} style={{ marginRight: '6px', color: '#2c2c2c' }} />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* Profile Settings & SNS — toggled via user profile widget when logged in */}
        {(!user || showProfilePanel) && (
          <>
        <section className="form-section glass-panel">
          <h2 className="section-title">프로필 설정</h2>
          <div className="admin-form">
            <div className="form-group">
              <label htmlFor="profileName">프로필 이름</label>
              <input 
                type="text" 
                id="profileName" 
                placeholder="이름 또는 채널명"
                value={data.profile.name || ''}
                onChange={(e) => {
                  const updated = {
                    ...data,
                    profile: { ...data.profile, name: e.target.value }
                  };
                  setData(updated);
                }}
                onBlur={() => saveData(data)}
              />
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="profileBio">소개글</label>
              <textarea 
                id="profileBio" 
                placeholder="나의 프로필 소개글"
                rows={2}
                value={data.profile.bio || ''}
                onChange={(e) => {
                  const updated = {
                    ...data,
                    profile: { ...data.profile, bio: e.target.value }
                  };
                  setData(updated);
                }}
                onBlur={() => saveData(data)}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
            </div>
          </div>
        </section>

        {/* SNS Channels Management Section */}
        <section className="form-section glass-panel">
          <h2 className="section-title">SNS 채널 관리</h2>
          <p className="sync-description" style={{ marginBottom: '12px' }}>
            프로필 하단에 연결할 채널 URL을 등록하세요. 파비콘과 채널명은 자동으로 표시됩니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {socialsList.map((social, index) => (
              <div key={social.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="https://youtube.com/@channel ..."
                  value={social.url}
                  onChange={(e) => handleUpdateChannel(social.id, 'url', e.target.value)}
                  onBlur={(e) => {
                    const url = e.target.value;
                    const updatedSocials = socialsList.map((s) =>
                      s.id === social.id
                        ? { ...s, url, platform: detectPlatformFromUrl(url) }
                        : s
                    );
                    const updated = { ...data, profile: { ...data.profile, socials: updatedSocials } };
                    setData(updated);
                    saveData(updated);
                  }}
                  style={{ flex: 1, height: '42px', padding: '0 12px' }}
                />
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleMoveChannel(index, -1)}
                    disabled={index === 0}
                    className="drag-btn"
                    style={{ height: '36px', width: '30px', padding: 0 }}
                    title="위로 이동"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveChannel(index, 1)}
                    disabled={index === socialsList.length - 1}
                    className="drag-btn"
                    style={{ height: '36px', width: '30px', padding: 0 }}
                    title="아래로 이동"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoveChannel(social.id)}
                    className="action-icon-btn delete-icon-btn"
                    style={{ height: '36px', width: '36px', minWidth: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {socialsList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '14px' }}>
                등록된 SNS 채널이 없습니다. 아래 버튼을 눌러 추가해 보세요!
              </div>
            )}
          </div>

          <button
            onClick={handleAddChannel}
            className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '42px', cursor: 'pointer' }}
          >
            <Plus size={16} />
            <span>새 채널 추가</span>
          </button>
        </section>
          </>
        )}

        {/* Quick Add Card Form */}
        <section className="form-section glass-panel">
          <h2 className="section-title">스마트 링크 추가</h2>
          
          <form onSubmit={handleDetectLinks} className="admin-form">
            <div className="form-group">
              <label htmlFor="snsUrl">유튜브 / SNS 영상 링크</label>
              <div className="input-with-action">
                <input 
                  type="text" 
                  id="snsUrl" 
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={snsUrl}
                  onChange={(e) => {
                    setSnsUrl(e.target.value);
                    setPendingCard(null);
                  }}
                  disabled={isDetecting || isAdding}
                  required
                />
                <button 
                  type="submit" 
                  className="btn-primary submit-btn"
                  disabled={isDetecting || isAdding || !snsUrl}
                  style={{ whiteSpace: 'nowrap', padding: '0 20px', height: '48px' }}
                >
                  {isDetecting ? (
                    <RefreshCw size={18} className="spin" />
                  ) : (
                    <>
                      <Eye size={18} />
                      <span>링크 감지</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {pendingCard && (
            <div className="detected-links-preview">
              <div className="detected-preview-header">
                {pendingCard.thumbnailUrl && (
                  <div className="detected-preview-thumb">
                    <img src={pendingCard.thumbnailUrl} alt="" />
                  </div>
                )}
                <div className="detected-preview-meta">
                  <p className="detected-preview-title">{pendingCard.title}</p>
                  <p className="detected-preview-sub">
                    감지된 링크 {pendingCard.partnersLinks.length}개 · 최대 2개까지 카드에 포함됩니다
                  </p>
                </div>
              </div>

              {pendingCard.partnersLinks.length > 0 ? (
                <ul className="detected-links-list">
                  {pendingCard.partnersLinks.map((pl, index) => (
                    <li key={`${pl.url}-${index}`} className="detected-link-item">
                      {getFaviconUrl(pl.url) && (
                        <img src={getFaviconUrl(pl.url)} alt="" className="detected-link-favicon" />
                      )}
                      <div className="detected-link-text">
                        <span className="detected-link-label">{pl.label}</span>
                        <span className="detected-link-url">{pl.url}</span>
                      </div>
                      <button
                        type="button"
                        className="action-icon-btn delete-icon-btn detected-link-remove"
                        onClick={() => handleRemovePendingLink(index)}
                        title="링크 제거"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="detected-links-empty">감지된 링크가 없습니다. 그대로 추가하거나 URL을 다시 확인해 주세요.</p>
              )}

              <div className="detected-preview-actions">
                <button type="button" className="btn-secondary" onClick={handleCancelPending} disabled={isAdding}>
                  취소
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmAddCard}
                  disabled={isAdding}
                >
                  {isAdding ? <RefreshCw size={16} className="spin" /> : <Plus size={16} />}
                  <span>{isAdding ? '추가 중...' : '카드 추가'}</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* List of Existing Cards */}
        <section className="list-section">
          <h2 className="section-title">등록된 링크 피드 ({data.links.length}개)</h2>
          
          <div className="links-list-stream">
            {data.links.map((link, index) => (
              <div key={link.id} className="list-item-card glass-panel">
                
                <div className="card-drag-controls">
                  <button 
                    className="drag-btn" 
                    onClick={() => moveCard(index, -1)}
                    disabled={index === 0}
                    title="위로 이동"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <span className="card-order-num">{data.links.length - index}</span>
                  <button 
                    className="drag-btn" 
                    onClick={() => moveCard(index, 1)}
                    disabled={index === data.links.length - 1}
                    title="아래로 이동"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>

                {link.thumbnailUrl && (
                  <div className="card-list-thumb">
                    <img src={link.thumbnailUrl} alt="" />
                  </div>
                )}

                <div className="card-list-meta">
                  <h3 className="card-list-title">{link.title}</h3>
                  <div className="card-list-urls">
                    <span className="url-badge sns-badge">
                      {link.platform === 'youtube' ? 'YouTube' : link.platform === 'tiktok' ? 'TikTok' : 'Link'}
                    </span>
                    <span className="url-badge partners-badge">
                      감지 링크 {link.partnersLinks?.length || 0}개
                    </span>
                    <span className="click-counter">
                      <Eye size={12} style={{ marginRight: '3px' }} />
                      클릭수: <strong>{link.clicks || 0}</strong>
                    </span>
                  </div>
                  {link.partnersLinks?.length > 0 && (
                    <ul className="card-partners-list">
                      {link.partnersLinks.map((pl, plIndex) => (
                        <li key={`${link.id}-pl-${plIndex}`} className="card-partner-item">
                          {getFaviconUrl(pl.url) && (
                            <img src={getFaviconUrl(pl.url)} alt="" className="detected-link-favicon" />
                          )}
                          <div className="detected-link-text">
                            <span className="detected-link-label">{pl.label || '링크'}</span>
                            <span className="detected-link-url">{pl.url}</span>
                          </div>
                          <button
                            type="button"
                            className="action-icon-btn delete-icon-btn detected-link-remove"
                            onClick={() => handleRemovePartnerLink(link.id, plIndex)}
                            title="링크 제거"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="card-list-actions">
                  <button 
                    className="action-icon-btn delete-icon-btn" 
                    onClick={() => handleDeleteCard(link.id)}
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Sync Panel */}
        <section className="sync-section glass-panel">
          <h2 className="section-title">
            <Info size={16} className="title-icon-minor" style={{ marginRight: '6px', color: '#2c2c2c' }} />
            <span>배포용 데이터 싱크</span>
          </h2>
          <p className="sync-description">
            Vercel/GitHub Pages 등에 배포했을 때도 이 설정이 똑같이 뜨게 하려면 아래 <strong>설정 파일 다운로드</strong> 버튼을 눌러 <code>links.json</code>을 내려받은 뒤, 
            프로젝트 경로의 <code>src/data/links.json</code>에 덮어씌워 빌드/업로드 하시면 됩니다.
          </p>

          <div className="sync-actions-row">
            <button className="btn-secondary" onClick={handleCopyJson}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? '복사 완료!' : '설정 JSON 복사'}</span>
            </button>
            <button className="btn-primary" onClick={handleDownloadJson}>
              <Download size={16} />
              <span>설정 파일 다운로드 (links.json)</span>
            </button>
            <button className="btn-danger" onClick={handleResetToDefault} style={{ background: 'var(--highlight-pink)' }}>
              <span>로컬 브라우저 데이터 초기화</span>
            </button>
          </div>
        </section>

      </main>

    </div>
  );
}
