import { useState } from 'react';
import type { CSSProperties } from 'react';

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

  if (!textSummary || Object.keys(textSummary).length === 0) return null;

  return (
    <div className="card reveal-card" style={{ '--reveal-delay': '160ms' } as CSSProperties}>
      <div
        className="card-title"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>分析结论</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{expanded ? '收起' : '展开'}</span>
      </div>
      {expanded && (
        <div>
          {Object.entries(SECTIONS).map(([key, label]) => {
            const text = textSummary[key];
            if (!text) return null;
            return (
              <div key={key} className="animate-stream" style={{ marginBottom: 16 }}>
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
