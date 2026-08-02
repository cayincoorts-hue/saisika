import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoBadge from '../components/demo/DemoBadge';
import { demoAnalysisSource } from '../demo/demoAnalysisSource';
import type { AnalysisProgress } from '../types/analysis';

const STAGE_LABELS: Record<string, string> = {
  structure: '检查数据结构',
  graph: '构建供应链关系',
  risk: '识别风险信号',
  domain: '检测领域模式',
  decision: '生成行动建议',
  fingerprint: '计算可复现性指纹',
};

export default function DemoAnalyzePage() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<AnalysisProgress[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const collected: AnalysisProgress[] = [];
    demoAnalysisSource
      .analyze('demo', (p) => {
        if (cancelled) return;
        collected.push(p);
        setStages([...collected]);
      })
      .then(() => {
        if (!cancelled) setDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => navigate('/demo/result'), 600);
      return () => clearTimeout(timer);
    }
  }, [done, navigate]);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '16px' }}>
        正在分析 <DemoBadge />
      </h2>
      <div data-tour="analysis-progress" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        {Object.entries(STAGE_LABELS).map(([key, label]) => {
          const reached = stages.find((s) => s.stage === key);
          const isDone = reached !== undefined;
          const isLast = key === stages[stages.length - 1]?.stage;
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                opacity: isDone ? 1 : 0.4,
                transition: 'opacity 0.3s',
              }}
            >
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDone ? '#fff' : '#9ca3af',
                  background: isDone ? '#0f766e' : '#e5e7eb',
                }}
              >
                {isDone ? '✓' : ''}
              </span>
              <span style={{ fontSize: '15px', fontWeight: isDone ? 600 : 400, color: isDone ? '#1f2937' : '#9ca3af' }}>
                {label}
              </span>
              {isLast && !done && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f766e', animation: 'pulse 1.5s infinite' }} />
              )}
            </div>
          );
        })}
      </div>
      {done && (
        <p style={{ marginTop: '24px', fontSize: '14px', color: '#0f766e', fontWeight: 500 }}>
          分析完成，正在跳转结果页...
        </p>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
