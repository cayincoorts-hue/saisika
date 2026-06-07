import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const isHistory = location.pathname === '/history';
  const isResult = location.pathname.startsWith('/result');
  const isConfirm = location.pathname.startsWith('/confirm');

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('saiska-lang', next);
  };

  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand" onClick={e => { e.preventDefault(); navigate('/'); }}>
        <span className="navbar-brand-mark">S</span>
        Saisca
      </a>

      <div className="navbar-right">
        {isHome && (
          <button
            className={`navbar-action ${isHistory ? 'is-active' : ''}`}
            onClick={() => navigate('/history')}
          >
            {t('history.title')}
          </button>
        )}

        {isHistory && (
          <button
            className="navbar-action"
            onClick={() => navigate('/')}
          >
            ← {t('history.newAnalysis')}
          </button>
        )}

        {isConfirm && (
          <button
            className="navbar-action"
            onClick={() => navigate('/')}
          >
            ← {t('common.backHome')}
          </button>
        )}

        {isResult && (
          <>
            <button
              className="navbar-action"
              onClick={() => navigate('/')}
            >
              ← {t('result.analyzeNewData')}
            </button>
            <button
              className={`navbar-action ${isHistory ? 'is-active' : ''}`}
              onClick={() => navigate('/history')}
              style={{ marginLeft: -4 }}
            >
              {t('history.title')}
            </button>
          </>
        )}

        <button
          onClick={toggleLang}
          className="navbar-lang"
          title={t('nav.language')}
        >
          {i18n.language === 'en' ? '中文' : 'EN'}
        </button>
      </div>
    </nav>
  );
}
