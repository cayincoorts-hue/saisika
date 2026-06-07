import type { CompareResult } from './use-scenario-compare';
import { useTranslation } from 'react-i18next';

interface Props {
  result: CompareResult;
  loading: boolean;
  error: string;
  onBackToEditor: () => void;
}

export default function ChangeSummaryBar({ result, loading, error, onBackToEditor }: Props) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const changes = result?.diff?.changes || [];
  const trend = result?.diff?.trend;

  const trendLabel: Record<string, string> = {
    improved: isZh ? '风险改善' : 'Risk Improved' /* unused */,
    worsened: isZh ? '风险恶化' : 'Risk Worsened' /* unused */,
    unchanged: isZh ? '无明显变化' : 'No Significant Change' /* unused */,
  };

  const trendColor: Record<string, string> = {
    improved: 'var(--color-ok)',
    worsened: 'var(--color-error)',
    unchanged: 'var(--color-muted)',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        height: 44,
        background: 'var(--color-surface-cream-strong)',
        padding: '0 var(--spacing-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 13,
        color: 'var(--color-body)',
        gap: 'var(--spacing-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
        {loading ? (
          <span>{isZh ? "正在计算..." : "Calculating..."}</span>
        ) : error ? (
          <span style={{ color: 'var(--color-error)' }}>{error}</span>
        ) : (
          <>
            <span>{changes.join(' · ')}</span>
            {trend && (
              <span style={{
                color: trendColor[trend] || 'var(--color-muted)',
                fontWeight: 500,
              }}>
                — {trendLabel[trend] || trend}
              </span>
            )}
          </>
        )}
      </div>

      <button
        onClick={onBackToEditor}
        style={{
          background: 'transparent',
          color: 'var(--color-body)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-xs)',
          height: 28,
          padding: '0 12px',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 400,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        返回编辑
      </button>
    </div>
  );
}
