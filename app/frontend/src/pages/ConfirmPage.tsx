import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SectionCard from '../components/layout/SectionCard';
import TopNotice from '../components/layout/TopNotice';
import { analyzeSSE } from '../utils/api';

interface ProgressInfo {
  stage: string;
  message: string;
  details?: any;
}

export default function ConfirmPage() {
  const { t, i18n } = useTranslation();
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState('');
  const [textSections, setTextSections] = useState<Record<string, string>>({});

  const STAGE_LABELS: Record<string, string> = {
    start: t('confirm.progress.preparing'),
    reading: t('confirm.progress.readingFiles'),
    mapping: t('confirm.progress.fieldIdentification'),
    merging: t('confirm.progress.dataMerge'),
    graph: t('confirm.progress.buildingGraph'),
    risk: t('confirm.progress.riskAssessment'),
    analysis: t('confirm.progress.generatingResults'),
    done: t('confirm.progress.complete'),
  };

  const stageKeys = Object.keys(STAGE_LABELS);
  const completedStages = progress ? stageKeys.indexOf(progress.stage) : -1;
  const totalStages = stageKeys.length;

  const handleStart = () => {
    if (!batchId) return;
    setAnalyzing(true);
    setError('');
    setProgress({ stage: 'start', message: t('confirm.analyzing') });
    setTextSections({});

    analyzeSSE(
      batchId,
      (data) => setProgress({ stage: data.stage, message: data.message, details: data.details }),
      (data) => setTextSections(prev => ({ ...prev, [data.section]: data.content })),
      () => {
        setProgress({ stage: 'done', message: t('confirm.progress.redirecting') });
        setTimeout(() => navigate(`/result/${batchId}`), 800);
      },
      (msg) => {
        setError(msg);
        setAnalyzing(false);
      },
      i18n.language
    );
  };

  return (
    <>
      <div className="page-header">
        <h1>{t('confirm.title')}</h1>
        <p>{t('confirm.step')}</p>
      </div>

      <TopNotice type="error" message={error} />

      <SectionCard title={t('confirm.batchInfo')}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Batch ID: <code>{batchId}</code>
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 8 }}>
          {t('confirm.autoAnalyzeHint')}
        </p>
      </SectionCard>

      {!analyzing && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-outline" onClick={() => navigate('/')}>
            {t('confirm.backToUpload')}
          </button>
          <button className="btn btn-primary btn-lg" onClick={handleStart} style={{ minWidth: 160 }}>
            {t('confirm.startAnalysis')}
          </button>
        </div>
      )}

      {analyzing && (
        <SectionCard title={t('confirm.progressTitle')}>
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
          <p style={{ fontSize: 'var(--text-sm)', marginTop: 12, color: 'var(--color-text-secondary)' }}>
            {progress && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="loading-spinner" style={{ width: 16, height: 16 }} />
                {STAGE_LABELS[progress.stage] || progress.stage}：{progress.message}
              </span>
            )}
          </p>
          {progress?.details && (
            <pre style={{ marginTop: 12 }}>
              {JSON.stringify(progress.details, null, 2)}
            </pre>
          )}
        </SectionCard>
      )}

      {Object.keys(textSections).length > 0 && (
        <SectionCard title={t('confirm.previewTitle')}>
          {Object.entries(textSections).map(([key, text]) => (
            <div key={key} className="stagger-item" style={{ '--item-delay': '100ms', marginBottom: 12 } as React.CSSProperties}>
              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>{key}</strong>
              <p style={{ fontSize: 'var(--text-sm)', marginTop: 4, color: 'var(--color-text-secondary)' }}>{text}</p>
            </div>
          ))}
        </SectionCard>
      )}
    </>
  );
}
