import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('saiska-lang', next);
  };

  return (
    <button
      onClick={toggle}
      className="lang-switcher"
      title={t('nav.language')}
    >
      {i18n.language === 'en' ? '中文' : 'EN'}
    </button>
  );
}
