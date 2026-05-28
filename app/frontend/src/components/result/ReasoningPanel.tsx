import { useState } from 'react';
import type { CSSProperties } from 'react';

interface ReasoningStep {
  step: number;
  name: string;
  description: string;
  detail?: Record<string, any>;
}

interface CauseDetail {
  label: string;
  triggered_by: string;
  actual_value: string | number;
  threshold: string | number;
  excess_ratio?: string | number;
}

interface ActionJustification {
  action_type: string;
  reasons: string[];
  alternatives: string[];
}

interface NodeRow {
  node_id: string;
  risk_score: number;
  risk_level: string;
  risk_causes: string[];
  risk_causes_detail: CauseDetail[];
  action_type: string;
  action_justification: ActionJustification;
  recommended_action: string;
  reasoning_trail: {
    data_sources: string[];
    steps: ReasoningStep[];
    risk_level_thresholds: { high: number; medium: number };
  };
}

interface Props {
  data: any;
}

const RISK_COLORS: Record<string, string> = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#27ae60',
};

export default function ReasoningPanel({ data }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});

  if (!data || data.status === 'unavailable' || data.status === 'error') return null;

  const nodes: NodeRow[] = data.rows || [];
  if (nodes.length === 0) return null;

  const toggleNode = (nid: string) => {
    setOpenNodes(prev => ({ ...prev, [nid]: !prev[nid] }));
  };

  return (
    <div className="card reveal-card" style={{ '--reveal-delay': '200ms' } as CSSProperties}>
      <div
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{ margin: 0, fontSize: '1rem' }}>推理过程</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          {expanded ? '收起' : '展开'}
        </span>
      </div>

      {!expanded && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: 8 }}>
          点击展开查看各高风险节点的完整计算过程和触发条件。共 {nodes.length} 个节点可查看。
        </p>
      )}

      {expanded && (
        <div style={{ marginTop: 16 }}>
          {nodes.map((node) => {
            const trail = node.reasoning_trail;
            const steps = trail?.steps || [];
            const dataSources = trail?.data_sources || [];
            const isOpen = openNodes[node.node_id];

            return (
              <div
                key={node.node_id}
                style={{
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 8,
                  marginBottom: 12,
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => toggleNode(node.node_id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isOpen ? 'rgba(52,152,219,0.05)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: RISK_COLORS[node.risk_level] || '#95a5a6',
                      }}
                    />
                    <strong>{node.node_id}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                      风险评分 {node.risk_score.toFixed(3)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#ecf0f1',
                        color: '#2c3e50',
                      }}
                    >
                      {node.action_type}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    {isOpen ? '收起' : '展开'}
                  </span>
                </div>

                {isOpen && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-hairline)' }}>
                    {/* 数据来源 */}
                    {dataSources.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          数据来源：
                        </span>
                        <span style={{ fontSize: '0.85rem' }}>
                          {dataSources.join('、')}
                        </span>
                      </div>
                    )}

                    {/* 计算步骤 */}
                    {steps.map((step) => (
                      <div
                        key={step.step}
                        style={{
                          padding: '6px 0 6px 16px',
                          borderLeft: '2px solid var(--color-accent)',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
                          步骤 {step.step}：{step.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                          {step.description}
                        </div>
                        {step.detail?.contributions && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: 4 }}>
                            分量贡献：
                            波动性 {step.detail.contributions.volatility?.toFixed(4)}，
                            库存 {step.detail.contributions.inventory?.toFixed(4)}，
                            交期 {step.detail.contributions.delivery_delay?.toFixed(4)}，
                            延迟标记 {step.detail.contributions.delay_flag?.toFixed(4)}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 风险等级划分标准 */}
                    {trail?.risk_level_thresholds && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 8 }}>
                        风险等级划分：≥{trail.risk_level_thresholds.high} 为高风险，
                        ≥{trail.risk_level_thresholds.medium} 为中风险，其余为低风险
                      </div>
                    )}

                    {/* 触发原因详情 */}
                    {node.risk_causes_detail && node.risk_causes_detail.length > 0 && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: '8px 12px',
                          background: '#fef9e7',
                          borderRadius: 4,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                          触发原因详情
                        </div>
                        {node.risk_causes_detail.map((cd, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', lineHeight: 1.8 }}>
                            • {cd.label}
                            {cd.actual_value && cd.threshold && (
                              <span style={{ color: 'var(--color-muted)' }}>
                                ：实际值 {cd.actual_value}，阈值 {cd.threshold}
                                {cd.excess_ratio ? `，超出 ${cd.excess_ratio}%` : ''}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 动作依据 */}
                    {node.action_justification && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '8px 12px',
                          background: '#eaf2f8',
                          borderRadius: 4,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                          动作依据
                        </div>
                        {node.action_justification.reasons?.map((r, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', lineHeight: 1.8 }}>
                            • {r}
                          </div>
                        ))}
                        {node.action_justification.alternatives?.length > 0 && (
                          <>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', marginTop: 8, marginBottom: 4 }}>
                              替代方案评估
                            </div>
                            {node.action_justification.alternatives.map((a, i) => (
                              <div key={i} style={{ fontSize: '0.8rem', lineHeight: 1.8, color: 'var(--color-muted)' }}>
                                • {a}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
