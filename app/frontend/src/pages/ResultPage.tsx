import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SectionCard from '../components/layout/SectionCard';
import TopNotice from '../components/layout/TopNotice';
import SummaryPanel from '../components/result/SummaryPanel';
import RiskNodeTable from '../components/result/RiskNodeTable';
import DownloadPanel from '../components/result/DownloadPanel';
import CapabilityHintPanel from '../components/result/CapabilityHintPanel';
import ReasoningPanel from '../components/result/ReasoningPanel';
import RiskTrendChart from '../components/charts/RiskTrendChart';
import RiskDistributionChart from '../components/charts/RiskDistributionChart';
import ForceGraph3D from '../components/charts/ForceGraph3D';
import PropagationTimelineChart from '../components/charts/PropagationTimelineChart';
import DataConfidenceChart from '../components/charts/DataConfidenceChart';
import CompareView from '../components/scenario/CompareView';
import { getResults } from '../utils/api';
import { isDemoMode } from '../runtime/mode';
import { demoAnalysisSource } from '../demo/demoAnalysisSource';

export default function ResultPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'comparing'>('normal');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setLoading(true);
      demoAnalysisSource
        .getResult('demo')
        .then(setData)
        .catch((err: any) => setError(err?.detail || err?.message || t('result.loadingResult')))
        .finally(() => setLoading(false));
      return;
    }
    if (!batchId) return;
    setLoading(true);
    getResults(batchId)
      .then(setData)
      .catch(err => setError(err?.detail || err?.message || t('result.loadingResult')))
      .finally(() => setLoading(false));
  }, [batchId, t]);

  const visuals = data?.visuals || {};
  const inputSummary = data?.input_summary || data?.meta || {};
  const timestamp = data?.meta?.generated_at
    ? new Date(data.meta.generated_at).toLocaleString()
    : '';

  const allNodesTable = useMemo(() => {
    const riskRows = visuals.high_risk_nodes?.rows || [];
    const graphNodes = visuals.propagation_timeline?.nodes || [];
    const riskMap: Record<string, any> = {};
    for (const r of riskRows) riskMap[r.node_id] = r;
    return graphNodes.map((n: any) => ({
      ...(riskMap[n.id] || {}),
      node_id: n.id || n.node_id,
      node_name: n.name || '',
      risk_score: riskMap[n.id]?.risk_score ?? 0,
      risk_level: riskMap[n.id]?.risk_level ?? 'low',
      risk_causes: riskMap[n.id]?.risk_causes ?? [],
      risk_causes_detail: riskMap[n.id]?.risk_causes_detail ?? [],
      recommended_action: riskMap[n.id]?.recommended_action ?? '',
      action_type: riskMap[n.id]?.action_type ?? '',
    }));
  }, [visuals]);

  const graphData = useMemo(() => {
    const raw = visuals.propagation_timeline || {};
    const nodes = (raw.nodes || []).map((n: any) => ({ ...n, _degree: (n.in_degree || 0) + (n.out_degree || 0) }));
    return { nodes, edges: raw.edges || [], isolatedCount: nodes.filter((n: any) => n._degree === 0).length };
  }, [visuals.propagation_timeline]);

  if (loading) {
    return (
      <div className="loading-page">
        <span className="loading-spinner loading-spinner-lg" />
        <span>{t('result.loadingResult')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <TopNotice type="error" message={error} />
        <button className="btn btn-outline" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </>
    );
  }

  if (!data) return null;

  if (viewMode === 'comparing') {
    return (
      <>
        <div className="page-header">
          <h1>{t('result.title')}</h1>
          {timestamp && <p>{t('common.generatedAt')} {timestamp}</p>}
        </div>
        <CompareView result={compareResult} loading={compareLoading} error={compareError} onBackToEditor={() => { setViewMode('normal'); setCompareError(''); }} />
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>{t('result.title')}</h1>
        {timestamp && <p>{t('common.generatedAt')} {timestamp}</p>}
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">{inputSummary.file_count || inputSummary.total_files || '—'}</div>
            <div className="stat-card-label">{t('result.files')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">{inputSummary.row_count || '—'}</div>
            <div className="stat-card-label">{t('result.dataRows')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 12l4-4m-4 4l-4 4"/>
            </svg>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">{inputSummary.node_count || '—'}</div>
            <div className="stat-card-label">{t('result.nodes')}</div>
          </div>
        </div>
        {graphData.edges.length > 0 && (
          <div className="stat-card">
            <div className="stat-card-icon amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-card-value">{graphData.edges.length}</div>
              <div className="stat-card-label">{t('result.edges')}</div>
            </div>
          </div>
        )}
      </div>

      <SummaryPanel textSummary={data.text_summary} />
      <ReasoningPanel data={visuals.high_risk_nodes} />

      {visuals.domain_insights && visuals.domain_insights.status !== 'unavailable' && (
        <SectionCard title={t('domainInsights.title')} delay={200}>
          {visuals.domain_insights.status === 'limited' ? (
            <div className="notice notice-info" style={{ marginBottom: 12 }}>
              {visuals.domain_insights.missing_reason || visuals.domain_insights.summary}
            </div>
          ) : (
            <>
              <p style={{ fontSize: 'var(--text-sm)', marginBottom: 12 }}>{visuals.domain_insights.summary}</p>
              {visuals.domain_insights.bullwhip_nodes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 'var(--text-xs)' }}>{t('domainInsights.bullwhipNodes')}：</strong>
                  {visuals.domain_insights.bullwhip_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: 'var(--text-xs)', padding: '4px 0', color: 'var(--color-limited)' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
              {visuals.domain_insights.vmi_nodes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 'var(--text-xs)' }}>{t('domainInsights.vmiNodes')}：</strong>
                  {visuals.domain_insights.vmi_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: 'var(--text-xs)', padding: '4px 0', color: 'var(--color-ok)' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
              {visuals.domain_insights.qr_nodes?.length > 0 && (
                <div>
                  <strong style={{ fontSize: 'var(--text-xs)' }}>{t('domainInsights.qrNodes')}：</strong>
                  {visuals.domain_insights.qr_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: 'var(--text-xs)', padding: '4px 0' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </SectionCard>
      )}

      <div className="section-label">
        <span className="section-label-text">{t('result.charts')}</span>
        <span className="section-label-line" />
      </div>

      <SectionCard title={t('result.riskTrend')} delay={220}><RiskTrendChart data={visuals.risk_trend} /></SectionCard>
      <SectionCard title={t('result.riskDistribution')} delay={340}><RiskDistributionChart data={visuals.risk_distribution} /></SectionCard>

      <RiskNodeTable
        data={{ rows: allNodesTable }}
        batchId={batchId!}
        compareResult={compareResult}
        compareLoading={compareLoading}
        compareError={compareError}
        onCompareResult={(result: any) => { setCompareResult(result); setCompareLoading(false); setCompareError(''); setViewMode('comparing'); }}
        onBackToNormal={() => {}}
      />

      {graphData.nodes.length > 0 && (
        <SectionCard title={t('result.networkGraph3D')} delay={500}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            {t('result.dragToRotate')} · {t('result.scrollToZoom')} · {t('result.clickForDetail')}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            {graphData.edges.length > 400
              ? t('result.nodeEdgeCountTruncated', { nodes: graphData.nodes.length, shown: 400, total: visuals.propagation_timeline?.edges?.length || graphData.edges.length })
              : t('result.nodeEdgeCount', { nodes: graphData.nodes.length, edges: graphData.edges.length })}
          </p>
          <ForceGraph3D nodes={graphData.nodes} edges={graphData.edges} highlightNodeId={highlightNodeId} onNodeClick={setHighlightNodeId} isolatedCount={graphData.isolatedCount} />
        </SectionCard>
      )}

      <SectionCard title={t('result.propagation')} delay={620}><PropagationTimelineChart data={visuals.propagation_timeline} /></SectionCard>
      <SectionCard title={t('result.dataConfidence')} delay={740}><DataConfidenceChart data={visuals.data_confidence} /></SectionCard>
      <CapabilityHintPanel dataConfidence={visuals.data_confidence} />
      <DownloadPanel batchId={batchId!} hasResults={true} />
    </>
  );
}
