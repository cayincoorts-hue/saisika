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

/**
 * 分析页 — 六阶段推理链条
 * 每阶段显示：做什么（action）→ 产出什么（output），
 * 像流水线一样逐步点亮，透明展示引擎的推理过程。
 */
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

  const order = ['structure', 'graph', 'risk', 'domain', 'decision', 'fingerprint'];

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
        正在分析 <DemoBadge />
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
        六阶段推理链条——每一步做什么、产出什么，全程透明可追溯。
      </p>

      <div data-tour="analysis-progress" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {order.map((key, idx) => {
          const progress = stages.find((s) => s.stage === key);
          const isDone = progress !== undefined;
          const isActive = !isDone && stages.some((s) => order.indexOf(s.stage) === idx - 1) || (isDone && stages[stages.length - 1]?.stage === key && !done);
          const details = progress?.details as Record<string, string> | undefined;

          return (
            <div
              key={key}
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                opacity: isDone ? 1 : 0.45,
                transition: 'opacity 0.3s',
              }}
            >
              {/* 阶段序号 / 状态 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isDone ? '#fff' : '#9ca3af',
                    background: isDone ? '#0f766e' : '#e5e7eb',
                    flexShrink: 0,
                  }}
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                {idx < order.length - 1 && (
                  <span style={{ width: '2px', height: '100%', minHeight: '28px', background: isDone ? '#0f766e' : '#e5e7eb', margin: '4px 0' }} />
                )}
              </div>

              {/* 阶段内容 */}
              <div style={{ flex: 1, paddingBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: details ? 8 : 0 }}>
                  <span style={{ fontSize: '15px', fontWeight: isDone ? 600 : 500, color: isDone ? '#1f2937' : '#6b7280' }}>
                    {STAGE_LABELS[key]}
                  </span>
                  {isActive && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f766e', animation: 'pulse 1.2s infinite' }} />
                  )}
                </div>

                {isDone && details && (
                  <div style={{
                    marginTop: '6px',
                    padding: '10px 14px',
                    background: '#f0fdfa',
                    borderRadius: '8px',
                    border: '1px solid #99f6e4',
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: '#134e4a',
                  }}>
                    <div style={{ fontWeight: 500 }}>
                      <span style={{ color: '#0f766e' }}>做什么</span>：{details.action}
                    </div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>
                      <span style={{ color: '#0f766e' }}>产出</span>：{details.output}
                    </div>
                  </div>
                )}
              </div>
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
