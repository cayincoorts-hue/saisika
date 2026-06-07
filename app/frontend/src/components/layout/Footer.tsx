import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <span>{t('footer.privacy')}</span>
        <span className="app-footer-dot" />
        <a href="https://github.com/cengchenyicheng/saisika" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span className="app-footer-dot" />
        <span>{t('footer.license')}</span>
        <span className="app-footer-dot" />
        <span>{t('footer.version')} 1.4.0</span>
      </div>
    </footer>
  );
}
