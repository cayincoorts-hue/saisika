import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import SectionCard from '../components/layout/SectionCard';
import TopNotice from '../components/layout/TopNotice';
import { analyzeSSE } from '../utils/api';

interface ProgressInfo {
  stage: string;
  message: string;
  details?: any;
}

const STAGE_LABELS: Record<string, string> = {
  start: '准备中',
  reading: '读取文件',
  mapping: '字段识别',
  merging: '数据合并',
  graph: '构建网络图',
  risk: '风险评估',
  analysis: '生成分析结果',
  done: '分析完成',
};

export default function ConfirmPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState('');
  const [textSections, setTextSections] = useState<Record<string, string>>({});

  const stageKeys = Object.keys(STAGE_LABELS);
  const completedStages = progress ? stageKeys.indexOf(progress.stage) : -1;
  const totalStages = stageKeys.length;

  const handleStart = () => {
    if (!batchId) return;
    setAnalyzing(true);
    setError('');
    setProgress({ stage: 'start', message: '开始分析...' });
    setTextSections({});

    analyzeSSE(
      batchId,
      (data) => setProgress({ stage: data.stage, message: data.message, details: data.details }),
      (data) => setTextSections(prev => ({ ...prev, [data.section]: data.content })),
      () => {
        setProgress({ stage: 'done', message: '分析完成，正在跳转到结果页...' });
        setTimeout(() => navigate(`/result/${batchId}`), 800);
      },
      (msg) => {
        setError(msg);
        setAnalyzing(false);
      }
    );
  };

  return (
    <PageShell>
      <div className="page-header">
        <h1>Saisca</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>步骤 2/3：确认并分析</span>
      </div>

      <TopNotice type="error" message={error} />

      <SectionCard title="批次信息" delay={120}>
        <p style={{ fontSize: '0.9rem' }}>
          批次 ID：<code>{batchId}</code>
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: 8 }}>
          系统将自动识别字段、合并数据、构建网络图、计算风险评分并生成分析结论。
        </p>
      </SectionCard>

      {!analyzing && (
        <div className="stagger-item" style={{ '--item-delay': '260ms', textAlign: 'right', marginTop: 16 } as CSSProperties}>
          <button className="btn btn-outline" onClick={() => navigate('/')} style={{ marginRight: 12 }}>
            返回上一步
          </button>
          <button className="btn btn-primary" onClick={handleStart} style={{ minWidth: 160 }}>
            开始分析
          </button>
        </div>
      )}

      {analyzing && (
        <SectionCard title="分析进度" className="analysis-progress-card" delay={120}>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, ((completedStages + 1) / totalStages) * 100)}%` }}
            />
          </div>
          <div className="stage-rail">
            {stageKeys.map((stage, index) => (
              <div
                key={stage}
                className={[
                  'stage-dot',
                  index < completedStages ? 'is-complete' : '',
                  index === completedStages ? 'is-current' : '',
                ].filter(Boolean).join(' ')}
              >
                {STAGE_LABELS[stage]}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.9rem', marginTop: 8 }}>
            {progress && (
              <span>
                <span className="loading-spinner" style={{ marginRight: 8, width: 14, height: 14, verticalAlign: 'middle' }} />
                {STAGE_LABELS[progress.stage] || progress.stage}：{progress.message}
              </span>
            )}
          </p>
          {progress?.details && (
            <pre style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: 8, background: 'var(--color-surface-card)', padding: 8, borderRadius: 4 }}>
              {JSON.stringify(progress.details, null, 2)}
            </pre>
          )}
        </SectionCard>
      )}

      {Object.keys(textSections).length > 0 && (
        <SectionCard title="分析结论预览" delay={180}>
          {Object.entries(textSections).map(([key, text]) => (
            <div key={key} className="animate-stream" style={{ marginBottom: 12 }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--color-accent)' }}>{key}</strong>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{text}</p>
            </div>
          ))}
        </SectionCard>
      )}
    </PageShell>
  );
}
