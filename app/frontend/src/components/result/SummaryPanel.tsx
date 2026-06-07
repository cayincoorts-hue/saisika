import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import gsap, { shouldAnimate } from '../../utils/animations';

interface Props {
  textSummary: Record<string, string>;
}

const SECTION_ICONS: Record<string, string> = {
  current_judgment: '🔍',
  main_causes: '⚠️',
  impact_targets: '🎯',
  recommended_actions: '💡',
  need_more: '📋',
};

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
    <div className="card card-dark" style={{ marginBottom: 'var(--space-6)' }}>
      <div
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: expanded ? 'var(--space-6)' : 0,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 400,
          color: 'var(--color-on-dark)',
          margin: 0,
          letterSpacing: 'var(--tracking-tight)',
        }}>
          {t('summaryPanel.title')}
        </h3>
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-on-dark-soft)',
          fontWeight: 500,
          cursor: 'pointer',
          userSelect: 'none',
        }}>
          {expanded ? t('riskNodeTable.collapse') + ' ▲' : t('riskNodeTable.expand') + ' ▼'}
        </span>
      </div>

      {expanded && (
        <div ref={sectionsRef}>
          {Object.entries(SECTIONS).map(([key, label]) => {
            const text = textSummary[key];
            if (!text) return null;
            const icon = SECTION_ICONS[key] || '•';
            return (
              <div
                key={key}
                data-section
                style={{
                  marginBottom: 'var(--space-5)',
                  padding: 'var(--space-4)',
                  background: 'var(--color-dark-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-dark-border)',
                }}
              >
                <h4 style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  marginBottom: 'var(--space-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span>{icon}</span>
                  {label}
                </h4>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.8,
                  color: 'var(--color-on-dark-soft)',
                }}>
                  {text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
