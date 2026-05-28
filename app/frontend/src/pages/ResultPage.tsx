import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      .catch(err => setError(err?.detail || err?.message || '加载结果失败'))
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
          <p style={{ marginTop: 16, color: 'var(--color-muted)' }}>加载分析结果...</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <TopNotice type="error" message={error} />
        <button className="btn btn-outline" onClick={() => navigate('/')}>返回首页</button>
      </PageShell>
    );
  }

  if (!data) return null;

  return (
    <PageShell>
      <div className="page-header">
        <h1>Saisca</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>步骤 3/3：查看结果</span>
      </div>

      <SectionCard title="数据概况" delay={80}>
        <div className="grid-3">
          <div>
            <strong>{inputSummary.file_count || inputSummary.total_files || '—'}</strong>
            <br /><small style={{ color: 'var(--color-muted)' }}>文件数</small>
          </div>
          <div>
            <strong>{inputSummary.row_count || '—'}</strong>
            <br /><small style={{ color: 'var(--color-muted)' }}>数据行</small>
          </div>
          <div>
            <strong>{inputSummary.node_count || '—'}</strong>
            <br /><small style={{ color: 'var(--color-muted)' }}>节点</small>
          </div>
        </div>
      </SectionCard>

      <SummaryPanel textSummary={data.text_summary} />

      <ReasoningPanel data={visuals.high_risk_nodes} />

      {visuals.domain_insights && visuals.domain_insights.status !== 'unavailable' && (
        <SectionCard title="供应链领域洞察" delay={200}>
          {visuals.domain_insights.status === 'limited' ? (
            <div className="notice notice-info" style={{ marginBottom: 12 }}>
              {visuals.domain_insights.missing_reason || visuals.domain_insights.summary}
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>{visuals.domain_insights.summary}</p>
              {visuals.domain_insights.bullwhip_nodes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: '0.85rem' }}>牛鞭效应节点：</strong>
                  {visuals.domain_insights.bullwhip_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.82rem', padding: '4px 0', color: 'var(--color-limited)' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
              {visuals.domain_insights.vmi_nodes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: '0.85rem' }}>VMI 信息共享模式：</strong>
                  {visuals.domain_insights.vmi_nodes.map((n: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.82rem', padding: '4px 0', color: 'var(--color-ok)' }}>
                      • {n.node_id}：{n.detail}
                    </div>
                  ))}
                </div>
              )}
              {visuals.domain_insights.qr_nodes?.length > 0 && (
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>QR 高频补货特征：</strong>
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

      <SectionCard title="风险趋势图" delay={220}>
        <RiskTrendChart data={visuals.risk_trend} />
      </SectionCard>

      <SectionCard title="风险分布图" delay={340}>
        <RiskDistributionChart data={visuals.risk_distribution} />
      </SectionCard>

      <RiskNodeTable data={visuals.high_risk_nodes} />

      {graphData.nodes.length > 0 && (
        <SectionCard title="供应链网络 3D 关系图" delay={500}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: 4 }}>
            拖拽旋转 · 滚轮缩放 · 右键平移 · 点击节点查看连接关系
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-soft)', marginBottom: 12 }}>
            {graphData.edges.length > 400
              ? `共 ${graphData.nodes.length} 个节点，${graphData.edges.length >= 400 ? '显示权重最高的 400 条边' : ''}（总计 ${visuals.propagation_timeline?.edges?.length || graphData.edges.length} 条边）`
              : `${graphData.nodes.length} 个节点，${graphData.edges.length} 条边`
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
            <h4 style={{ marginBottom: 8 }}>节点连接数排名</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 8 }}>
              点击表格行可聚焦对应节点并高亮其所有连线
            </p>
            <NodeConnectivityTable
              nodes={graphData.nodes}
              highlightNodeId={highlightNodeId}
              onSelectNode={setHighlightNodeId}
            />
          </div>
        </SectionCard>
      )}

      <SectionCard title="风险传播时序图" delay={620}>
        <PropagationTimelineChart data={visuals.propagation_timeline} />
      </SectionCard>

      <SectionCard title="数据可信度" delay={740}>
        <DataConfidenceChart data={visuals.data_confidence} />
      </SectionCard>

      <CapabilityHintPanel dataConfidence={visuals.data_confidence} />

      <DownloadPanel batchId={batchId!} hasResults={true} />

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          分析新数据
        </button>
      </div>
    </PageShell>
  );
}
