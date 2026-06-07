import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('saiska-lang', next);
  };

  const showNav = !location.pathname.startsWith('/activate');

  return (
    <div className="app-layout">
      {showNav && (
        <nav className="navbar">
          <a
            href="/"
            className="navbar-brand"
            onClick={e => { e.preventDefault(); navigate('/'); }}
          >
            Saisca
          </a>
          <div className="navbar-links">
            <button
              className={`navbar-link ${isActive('/') ? 'is-active' : ''}`}
              onClick={() => navigate('/')}
            >
              Upload
            </button>
            <button
              className={`navbar-link ${isActive('/history') ? 'is-active' : ''}`}
              onClick={() => navigate('/history')}
            >
              History
            </button>
          </div>
          <div className="navbar-actions">
            <button onClick={toggleLang} className="lang-toggle">
              {i18n.language === 'en' ? 'ZH' : 'EN'}
            </button>
          </div>
        </nav>
      )}
      <main className="page-content">
        {children}
      </main>
    </div>
  );
}
