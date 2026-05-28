import { useState, useEffect, useRef } from 'react';
import gsap, { shouldAnimate } from '../../utils/animations';

interface Props {
  textSummary: Record<string, string>;
}

const SECTIONS: Record<string, string> = {
  current_judgment: '当前判断',
  main_causes: '主要原因',
  impact_targets: '影响对象',
  recommended_actions: '建议动作',
  need_more: '还需补充',
};

export default function SummaryPanel({ textSummary }: Props) {
  const [expanded, setExpanded] = useState(true);
  const sectionsRef = useRef<HTMLDivElement>(null);

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
        <span>分析结论</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{expanded ? '收起' : '展开'}</span>
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
