import type { CompareResult } from './use-scenario-compare';
import ChangeSummaryBar from './ChangeSummaryBar';
import { useTranslation } from 'react-i18next';

interface Props {
  result: CompareResult | null;
  loading: boolean;
  error: string;
  onBackToEditor: () => void;
}

export default function CompareView({ result, loading, error, onBackToEditor }: Props) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  if (!result && !loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <ChangeSummaryBar
        result={result!}
        loading={loading}
        error={error}
        onBackToEditor={onBackToEditor}
      />

      <div className="compare-horizontal" style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
      }}>
        {/* Left: Original */}
        <div
          aria-label={isZh ? "原始场景结果" : "Original Scenario Results"}
          className="compare-column"
          style={{
            flex: 1,
            minWidth: 0,
            padding: 'var(--spacing-md)',
            borderRight: '1px solid var(--color-hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--color-ink)',
            }}>
              {isZh ? "原始场景" : "Original Scenario"}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--color-muted)',
              background: 'var(--color-surface-soft)',
              padding: '2px 8px',
              borderRadius: 'var(--rounded-pill)',
            }}>
              {isZh ? "基准" : "Baseline"}
            </span>
          </div>

          {loading ? (
            <SkeletonContent />
          ) : (
            result && <ResultSummary scenario={result.original_scenario} />
          )}
        </div>

        {/* Right: Modified */}
        <div
          aria-label={isZh ? "修改后场景结果" : "Modified Scenario Results"}
          className="compare-column"
          style={{
            flex: 1,
            minWidth: 0,
            padding: 'var(--spacing-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--color-ink)',
            }}>
              {isZh ? "修改后场景" : "Modified Scenario"}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--color-on-primary)',
              background: 'var(--color-primary)',
              padding: '2px 8px',
              borderRadius: 'var(--rounded-pill)',
            }}>
              {isZh ? "新场景" : "New Scenario"}
            </span>
          </div>

          {loading ? (
            <SkeletonContent />
          ) : (
            result && <ResultSummary scenario={result.modified_scenario} diff={result.diff} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultSummary({ scenario, diff }: { scenario: any; diff?: any }) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const visuals = scenario?.visuals || {};
  const dist = visuals.risk_distribution || {};
  const highNodes = visuals.high_risk_nodes || {};

  const riskChanges = diff?.risk_score_changes || {};

  return (
    <div>
      {/* Quick stats */}
      {dist.donut && (
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          padding: 12,
          background: 'var(--color-surface-soft)',
          borderRadius: 'var(--rounded-sm)',
        }}>
          {dist.donut.data?.map((d: any) => (
            <div key={d.name} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-ink)' }}>
                {d.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{d.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Risk score changes */}
      {Object.keys(riskChanges).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--color-ink)' }}>
            {isZh ? "风险评分变化" : "Risk Score Changes"}
          </h4>
          {Object.entries(riskChanges).map(([nid, change]: [string, any]) => (
            <div key={nid} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid var(--color-hairline)',
              fontSize: 13,
            }}>
              <span style={{ fontWeight: 500 }}>{nid}</span>
              <span style={{
                color: change.delta < 0 ? 'var(--color-ok)' : change.delta > 0 ? 'var(--color-error)' : 'var(--color-muted)',
              }}>
                {change.from.toFixed(3)} → {change.to.toFixed(3)}
                {' '}
                ({change.delta > 0 ? '+' : ''}{change.delta.toFixed(3)})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* High risk nodes summary */}
      {highNodes.rows?.length > 0 && (
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--color-ink)' }}>
            {isZh ? `中高风险节点 (${highNodes.rows.length})` : `High/Medium Risk Nodes (${highNodes.rows.length})`}
          </h4>
          {highNodes.rows.slice(0, 5).map((row: any, i: number) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: 13,
              borderBottom: '1px solid var(--color-hairline-soft)',
            }}>
              <span>{row.node_id}</span>
              <span style={{
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: row.risk_level === 'high' ? 'var(--color-risk-high)' : 'var(--color-risk-mid)',
              }}>
                {row.risk_score?.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonContent() {
  return (
    <div aria-hidden="true">
      <div style={{
        height: 80,
        background: 'var(--color-hairline)',
        borderRadius: 'var(--rounded-sm)',
        marginBottom: 16,
        animation: 'soft-pulse 1.6s infinite',
      }} />
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          height: 28,
          background: 'var(--color-hairline)',
          borderRadius: 'var(--rounded-xs)',
          marginBottom: 8,
          animation: 'soft-pulse 1.6s infinite',
        }} />
      ))}
    </div>
  );
}
