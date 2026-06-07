import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
}

export default function AppShell({ children }: Props) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const mainNav: NavItem[] = [
    { key: 'upload', label: t('nav.upload'), icon: '📤', path: '/' },
    { key: 'history', label: t('nav.history'), icon: '📋', path: '/history' },
  ];

  const resultNav: NavItem[] = [];
  if (location.pathname.startsWith('/result')) {
    resultNav.push({ key: 'result', label: t('result.title'), icon: '📊', path: location.pathname });
  }
  if (location.pathname.startsWith('/confirm')) {
    resultNav.push({ key: 'confirm', label: t('confirm.title'), icon: '🔍', path: location.pathname });
  }

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('saiska-lang', next);
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <a
          href="/"
          className="sidebar-brand"
          onClick={e => { e.preventDefault(); navigate('/'); }}
        >
          <span className="sidebar-brand-icon">S</span>
          <span className="sidebar-brand-text">Saisca</span>
        </a>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">{t('nav.navigation')}</div>
          {mainNav.map(item => (
            <button
              key={item.key}
              className={`sidebar-link ${isActive(item.path) ? 'is-active' : ''}`}
              onClick={() => navigate(item.path)}
              style={{ position: 'relative' }}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {resultNav.length > 0 && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 'var(--space-4)' }}>
                {t('nav.current')}
              </div>
              {resultNav.map(item => (
                <button
                  key={item.key}
                  className={`sidebar-link ${isActive(item.path) ? 'is-active' : ''}`}
                  onClick={() => navigate(item.path)}
                  style={{ position: 'relative' }}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>v1.4.0</span>
            <button onClick={toggleLang} className="lang-toggle">
              {i18n.language === 'en' ? '中文' : 'EN'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-right" style={{ marginLeft: 'auto' }}>
            <button className="topbar-action" onClick={toggleLang}>
              🌐 {i18n.language === 'en' ? '中文' : 'English'}
            </button>
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
