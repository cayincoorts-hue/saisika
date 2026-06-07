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
import PropagationTimelineChart from '../components/charts/PropagationTimelineChart';
import DataConfidenceChart from '../components/charts/DataConfidenceChart';
import CompareView from '../components/scenario/CompareView';
import { getResults } from '../utils/api';

export default function ResultPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'comparing'>('normal');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    getResults(batchId)
      .then(setData)
      .catch(err => setError(err?.detail || err?.message || (isZh ? '加载结果失败' : 'Failed to load results')))
      .finally(() => setLoading(false));
  }, [batchId]);

  const visuals = data?.visuals || {};
  const inputSummary = data?.input_summary || data?.meta || {};

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
      action_type: riskMap[n.id]?.action_type ?? (riskMap[n.id] ? (isZh ? '维持现状' : 'Maintain') : ''),
    }));
  }, [visuals]);

  const graphData = useMemo(() => {
    const raw = visuals.propagation_timeline || {};
    const nodes = (raw.nodes || []).map((n: any) => ({ ...n, _degree: (n.in_degree || 0) + (n.out_degree || 0) }));
    return { nodes, edges: raw.edges || [], isolatedCount: nodes.filter((n: any) => n._degree === 0).length };
  }, [visuals.propagation_timeline]);

  const handleCompareResult = (result: any) => {
    setCompareResult(result);
    setCompareLoading(false);
    setCompareError('');
    setViewMode('comparing');
  };

  const handleBackToCompare = () => {
    setViewMode('normal');
    setCompareError('');
  };

  if (loading) {
    return <PageShell><div style={{ textAlign:'center',padding:80 }}><span className="loading-spinner" style={{ width:32,height:32 }} /><p style={{ marginTop:16,color:'var(--color-muted)' }}>{isZh ? '加载分析结果...' : 'Loading analysis results...'}</p></div></PageShell>;
  }

  if (error) {
    return <PageShell><TopNotice type="error" message={error} /><button className="btn btn-outline" onClick={() => navigate('/')}>{isZh ? '返回首页' : 'Back to Home'}</button></PageShell>;
  }

  if (!data) return null;

  if (viewMode === 'comparing') {
    return (
      <PageShell>
        <div className="page-header"><h1>Saisca</h1><span style={{ color:'var(--color-muted)',fontSize:'0.9rem' }}>{isZh ? '步骤 3/3：查看结果' : 'Step 3/3: View Results'}</span></div>
        <CompareView result={compareResult} loading={compareLoading} error={compareError} onBackToEditor={handleBackToCompare} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="page-header"><h1>Saisca</h1><span style={{ color:'var(--color-muted)',fontSize:'0.9rem' }}>{isZh ? '步骤 3/3：查看结果' : 'Step 3/3: View Results'}</span></div>

      <SectionCard title={isZh ? '数据概况' : 'Data Overview'} delay={80}>
        <div className="grid-3">
          <div><strong>{inputSummary.file_count || inputSummary.total_files || '—'}</strong><br /><small style={{ color:'var(--color-muted)' }}>{isZh ? '文件数' : 'Files'}</small></div>
          <div><strong>{inputSummary.row_count || '—'}</strong><br /><small style={{ color:'var(--color-muted)' }}>{isZh ? '数据行' : 'Rows'}</small></div>
          <div><strong>{inputSummary.node_count || '—'}</strong><br /><small style={{ color:'var(--color-muted)' }}>{isZh ? '节点' : 'Nodes'}</small></div>
        </div>
      </SectionCard>

      <SummaryPanel textSummary={data.text_summary} />
      <ReasoningPanel data={visuals.high_risk_nodes} />

      {visuals.domain_insights && visuals.domain_insights.status !== 'unavailable' && (
        <SectionCard title={isZh ? '供应链领域洞察' : 'Supply Chain Insights'} delay={200}>
          {visuals.domain_insights.status === 'limited' ? (
            <div className="notice notice-info" style={{ marginBottom:12 }}>{visuals.domain_insights.missing_reason || visuals.domain_insights.summary}</div>
          ) : (<>
            <p style={{ fontSize:'0.9rem',marginBottom:12 }}>{visuals.domain_insights.summary}</p>
            {visuals.domain_insights.bullwhip_nodes?.length > 0 && (<div style={{ marginBottom:8 }}><strong style={{ fontSize:'0.85rem' }}>{isZh ? '牛鞭效应节点：' : 'Bullwhip Nodes:'}</strong>{visuals.domain_insights.bullwhip_nodes.map((n:any,i:number)=><div key={i} style={{ fontSize:'0.82rem',padding:'4px 0',color:'var(--color-limited)' }}>• {n.node_id}：{n.detail}</div>)}</div>)}
            {visuals.domain_insights.vmi_nodes?.length > 0 && (<div style={{ marginBottom:8 }}><strong style={{ fontSize:'0.85rem' }}>{isZh ? 'VMI 信息共享模式：' : 'VMI Pattern:'}</strong>{visuals.domain_insights.vmi_nodes.map((n:any,i:number)=><div key={i} style={{ fontSize:'0.82rem',padding:'4px 0',color:'var(--color-ok)' }}>• {n.node_id}：{n.detail}</div>)}</div>)}
            {visuals.domain_insights.qr_nodes?.length > 0 && (<div><strong style={{ fontSize:'0.85rem' }}>{isZh ? 'QR 高频补货特征：' : 'QR Replenishment:'}</strong>{visuals.domain_insights.qr_nodes.map((n:any,i:number)=><div key={i} style={{ fontSize:'0.82rem',padding:'4px 0' }}>• {n.node_id}：{n.detail}</div>)}</div>)}
          </>)}
        </SectionCard>
      )}

      <SectionCard title={isZh ? '风险趋势图' : 'Risk Trend'} delay={220}><RiskTrendChart data={visuals.risk_trend} /></SectionCard>
      <SectionCard title={isZh ? '风险分布图' : 'Risk Distribution'} delay={340}><RiskDistributionChart data={visuals.risk_distribution} /></SectionCard>

      <RiskNodeTable
        data={{ rows: allNodesTable }}
        batchId={batchId!}
        compareResult={compareResult}
        compareLoading={compareLoading}
        compareError={compareError}
        onCompareResult={handleCompareResult}
        onBackToNormal={() => {}}
      />

      {graphData.nodes.length > 0 && (
        <SectionCard title={isZh ? '供应链网络 3D 关系图' : 'Supply Chain Network (3D)'} delay={500}>
          <p style={{ fontSize:'0.85rem',color:'var(--color-muted)',marginBottom:4 }}>{isZh ? '拖拽旋转 · 滚轮缩放 · 右键平移 · 点击节点查看连接关系' : 'Drag to rotate · Scroll to zoom · Right-drag to pan · Click nodes for connections'}</p>
          <p style={{ fontSize:'0.8rem',color:'var(--color-muted-soft)',marginBottom:12 }}>
            {graphData.edges.length > 400
              ? (isZh ? `共 ${graphData.nodes.length} 个节点，显示权重最高的 400 条边` : `${graphData.nodes.length} nodes, showing top 400 edges`)
              : (isZh ? `${graphData.nodes.length} 个节点，${graphData.edges.length} 条边` : `${graphData.nodes.length} nodes, ${graphData.edges.length} edges`)}
          </p>
          <ForceGraph3D nodes={graphData.nodes} edges={graphData.edges} highlightNodeId={highlightNodeId} onNodeClick={setHighlightNodeId} isolatedCount={graphData.isolatedCount} />
        </SectionCard>
      )}

      <SectionCard title={isZh ? '风险传播时序图' : 'Risk Propagation Timeline'} delay={620}><PropagationTimelineChart data={visuals.propagation_timeline} /></SectionCard>
      <SectionCard title="数据可信度" delay={740}><DataConfidenceChart data={visuals.data_confidence} /></SectionCard>
      <CapabilityHintPanel dataConfidence={visuals.data_confidence} />
      <DownloadPanel batchId={batchId!} hasResults={true} />

      <div style={{ textAlign:'center',marginTop:24 }}>
        <button className="btn btn-outline" onClick={() => navigate('/')}>分析新数据</button>
      </div>
    </PageShell>
  );
}
