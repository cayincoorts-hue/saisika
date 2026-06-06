import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageShell from '../components/layout/PageShell';
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
import NodeConnectivityTable from '../components/charts/NodeConnectivityTable';
import PropagationTimelineChart from '../components/charts/PropagationTimelineChart';
import DataConfidenceChart from '../components/charts/DataConfidenceChart';
import { getResults } from '../utils/api';

export default function ResultPage() {
  const { t } = useTranslation();
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    getResults(batchId)
      .then(setData)
      .catch(err => setError(err?.detail || err?.message || t('result.loadingResult')))
      .finally(() => setLoading(false));
  }, [batchId]);

  const visuals = data?.visuals || {};
  const inputSummary = data?.input_summary || data?.meta || {};

  const graphData = useMemo(() => {
    const raw = visuals.propagation_timeline || {};
    const nodes = (raw.nodes || []).map((n: any) => ({
      ...n,
      _degree: (n.in_degree || 0) + (n.out_degree || 0),
    }));
    const isolatedCount = nodes.filter((n: any) => n._degree === 0).length;
    return { nodes, edges: raw.edges || [], isolatedCount };
  }, [visuals.propagation_timeline]);

  if (loading) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <span className="loading-spinner" style={{ width: 32, height: 32 }} />
          <p style={{ marginTop: 16, color: 'var(--color-muted)' }}>{t('result.loadingResult')}</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <TopNotice type="error" message={error} />
        <button className="btn btn-outline" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </PageShell>
    );
  }

  if (!data) return null;

  return (
    <PageShell>
      <div className="page-header">
        <h1>Saisca</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{t('result.step')}</span>
      </div>

      <SectionCard title={t('result.summary')} delay={80}>
        <div className="grid-3">
          <div>
            <strong>{inputSummary.file_count || inputSummary.total_files || '—'}</strong>
            <br /><small style={{ color: 'var(--color-muted)' }}>{t('result.files')}</small>
          </div>
          <div>
            <strong>{inputSummary.row_count || '—'}</strong>
            <br /><small style={{ color: 'var(--color-muted)' }}>{t('result.dataRows')}</small>
          </div>
          <div>
            <strong>{inputSummary.node_count || '—'}</strong>
            <br /><small style={{ color: 'var(--color-muted)' }}>{t('result.nodes')}</small>
          </div>
        </div>
      </SectionCard>

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
              <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>{visuals.domain_insights.summary}</p>
              {visuals.domain_insights.bullwhip_nodes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: '0.85rem' }}>{t('domainInsights.bullwhipNodes')}：</strong>
                  {visuals.domain_insights.bullwhip_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.82rem', padding: '4px 0', color: 'var(--color-limited)' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
              {visuals.domain_insights.vmi_nodes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: '0.85rem' }}>{t('domainInsights.vmiNodes')}：</strong>
                  {visuals.domain_insights.vmi_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.82rem', padding: '4px 0', color: 'var(--color-ok)' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
              {visuals.domain_insights.qr_nodes?.length > 0 && (
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>{t('domainInsights.qrNodes')}：</strong>
                  {visuals.domain_insights.qr_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.82rem', padding: '4px 0' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </SectionCard>
      )}

      <SectionCard title={t('result.riskTrend')} delay={220}>
        <RiskTrendChart data={visuals.risk_trend} />
      </SectionCard>

      <SectionCard title={t('result.riskDistribution')} delay={340}>
        <RiskDistributionChart data={visuals.risk_distribution} />
      </SectionCard>

      <RiskNodeTable data={visuals.high_risk_nodes} />

      {graphData.nodes.length > 0 && (
        <SectionCard title={t('result.networkGraph3D')} delay={500}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: 4 }}>
            {t('result.dragToRotate')} · {t('result.scrollToZoom')} · {t('result.clickForDetail')}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-soft)', marginBottom: 12 }}>
            {graphData.edges.length > 400
              ? t('result.nodeEdgeCountTruncated', { nodes: graphData.nodes.length, shown: 400, total: visuals.propagation_timeline?.edges?.length || graphData.edges.length })
              : t('result.nodeEdgeCount', { nodes: graphData.nodes.length, edges: graphData.edges.length })
            }
          </p>
          <ForceGraph3D
            nodes={graphData.nodes}
            edges={graphData.edges}
            highlightNodeId={highlightNodeId}
            onNodeClick={setHighlightNodeId}
            isolatedCount={graphData.isolatedCount}
          />
          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>{t('result.nodeConnectivityRank')}</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 8 }}>
              {t('result.clickRowToFocus')}
            </p>
            <NodeConnectivityTable
              nodes={graphData.nodes}
              highlightNodeId={highlightNodeId}
              onSelectNode={setHighlightNodeId}
            />
          </div>
        </SectionCard>
      )}

      <SectionCard title={t('result.propagation')} delay={620}>
        <PropagationTimelineChart data={visuals.propagation_timeline} />
      </SectionCard>

      <SectionCard title={t('result.dataConfidence')} delay={740}>
        <DataConfidenceChart data={visuals.data_confidence} />
      </SectionCard>

      <CapabilityHintPanel dataConfidence={visuals.data_confidence} />

      <DownloadPanel batchId={batchId!} hasResults={true} />

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          {t('result.analyzeNewData')}
        </button>
      </div>
    </PageShell>
  );
}
