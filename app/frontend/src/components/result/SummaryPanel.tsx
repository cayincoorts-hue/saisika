import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import gsap, { shouldAnimate } from '../../utils/animations';

interface Props {
  textSummary: Record<string, string>;
}

export default function SummaryPanel({ textSummary }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const sectionsRef = useRef<HTMLDivElement>(null);

  const SECTIONS: Record<string, string> = {
    current_judgment: t('summaryPanel.currentJudgment'),
    main_causes: t('summaryPanel.mainCauses'),
    impact_targets: t('summaryPanel.impactTargets'),
    recommended_actions: t('summaryPanel.recommendedActions'),
    need_more: t('summaryPanel.needMore'),
  };

  useEffect(() => {
    if (!expanded || !sectionsRef.current || !shouldAnimate()) return;
    const items = sectionsRef.current.querySelectorAll<HTMLElement>('[data-section]');
    gsap.fromTo(
      items,
      { autoAlpha: 0, x: -16 },
      {
        autoAlpha: 1,
        x: 0,
        duration: 0.45,
        stagger: { each: 0.1, from: "start" },
        ease: "power2.out",
      }
    );
  }, [expanded]);

  if (!textSummary || Object.keys(textSummary).length === 0) return null;

  return (
    <div className="card">
      <div
        className="card-title"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>{t('summaryPanel.title')}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{expanded ? t('riskNodeTable.collapse') : t('riskNodeTable.expand')}</span>
      </div>
      {expanded && (
        <div ref={sectionsRef}>
          {Object.entries(SECTIONS).map(([key, label]) => {
            const text = textSummary[key];
            if (!text) return null;
            return (
              <div key={key} data-section style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--color-accent)', marginBottom: 4 }}>{label}</h4>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--color-text-primary)' }}>{text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
