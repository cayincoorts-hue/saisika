import { useTranslation } from 'react-i18next';
import { useDemoTour } from '../../demo/useDemoTour';

/**
 * 导览控制条 — 播放/暂停/上一步/下一步/退出。
 * 固定在底部，与讲解条互补，按钮带 data-tour-controls 供测试定位。
 */
export default function TourControls() {
  const { t } = useTranslation();
  const { status, stepIndex, totalSteps, start, pause, resume, next, previous, exit } = useDemoTour();

  if (status === 'idle') return null;

  const isPlaying = status === 'playing';
  const isComplete = status === 'complete';
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= totalSteps - 1;

  return (
    <div
      data-tour-controls
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        borderRadius: '999px',
        background: 'rgba(17, 24, 39, 0.9)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <button
        data-tour-control="exit"
        onClick={exit}
        aria-label={t('tour.exit')}
        title={t('tour.exit')}
        style={btnStyle}
      >
        ✕
      </button>

      <button
        data-tour-control="prev"
        onClick={previous}
        disabled={isFirst || isComplete}
        aria-label={t('tour.previous')}
        title={t('tour.previous')}
        style={btnStyle}
      >
        ←
      </button>

      {isComplete ? (
        <button
          data-tour-control="restart"
          onClick={start}
          aria-label={t('tour.restart')}
          title={t('tour.restart')}
          style={{ ...btnStyle, background: '#0f766e' }}
        >
          ↻
        </button>
      ) : isPlaying ? (
        <button
          data-tour-control="pause"
          onClick={pause}
          aria-label={t('tour.pause')}
          title={t('tour.pause')}
          style={{ ...btnStyle, background: '#0f766e' }}
        >
          ❚❚
        </button>
      ) : (
        <button
          data-tour-control="play"
          onClick={resume}
          aria-label={t('tour.play')}
          title={t('tour.play')}
          style={{ ...btnStyle, background: '#0f766e' }}
        >
          ▶
        </button>
      )}

      <button
        data-tour-control="next"
        onClick={next}
        disabled={isLast && !isComplete ? false : isComplete}
        aria-label={t('tour.next')}
        title={t('tour.next')}
        style={btnStyle}
      >
        →
      </button>

      <span
        data-tour-control="progress"
        style={{
          minWidth: '56px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#d1d5db',
          fontWeight: 500,
          letterSpacing: '0.5px',
        }}
      >
        {isComplete ? `${totalSteps}/${totalSteps}` : `${stepIndex + 1}/${totalSteps}`}
      </span>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s',
};
