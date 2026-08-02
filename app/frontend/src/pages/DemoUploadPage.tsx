import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DemoBadge from '../components/demo/DemoBadge';
import { demoAnalysisSource } from '../demo/demoAnalysisSource';
import type { DemoFileSummary } from '../types/analysis';

const ROLE_LABELS: Record<string, string> = {
  node: '节点表',
  fact: '事实表',
  edge: '关系表',
};

export default function DemoUploadPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<DemoFileSummary[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    demoAnalysisSource.getFiles().then(setFiles);
  }, []);

  const toggleDrop = (name: string) => {
    setDropped((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // 系统文件拖入时给"禁止"光标，虚拟卡片拖入时给"复制"光标
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'none' : 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setDragOver(false);
      dragCounter.current = 0;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const name = e.dataTransfer.getData('text/plain');
    if (name) {
      toggleDrop(name);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // 用户拖入了操作系统里的真实文件 —— 演示模式不支持，明确拒绝而不是静默
      setRejected(true);
      window.setTimeout(() => setRejected(false), 2600);
    }
  };

  const handleClick = (name: string) => {
    toggleDrop(name);
  };

  const allDropped = files.length > 0 && dropped.size === files.length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
        导入数据 <DemoBadge />
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        {t('upload.demoDropHint')}
      </p>

      {/* 演示模式说明条：明确不能导入真实文件 */}
      <div
        data-tour="demo-upload-notice"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          marginBottom: '16px',
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '8px',
          fontSize: '13px',
          lineHeight: 1.7,
          color: '#78350f',
        }}
      >
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span>
          <strong>{t('upload.demoNotice')}</strong>{' '}
          {t('upload.demoDownloadHint')}{' '}
          <a
            href="https://github.com/cayincoorts-hue/saisika/releases"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#0f766e', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {isZh ? '前往下载 →' : 'Get the app →'}
          </a>
        </span>
      </div>

      {/* 文件卡片区域 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        {files.map((f) => {
          const isDropped = dropped.has(f.name);
          return (
            <div
              key={f.name}
              data-tour="file-card"
              draggable={!isDropped}
              onDragStart={(e) => handleDragStart(e, f.name)}
              onClick={() => !isDropped && handleClick(f.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: isDropped ? '#f0fdf4' : '#fff',
                border: isDropped ? '2px solid #86efac' : '2px dashed #d1d5db',
                borderRadius: '10px',
                cursor: isDropped ? 'default' : 'pointer',
                opacity: isDropped ? 0.5 : 1,
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
            >
              {/* macOS 风格文件夹图标 */}
              <svg width="40" height="32" viewBox="0 0 40 32" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 6C2 4.34315 3.34315 3 5 3H14L17 6H35C36.6569 6 38 7.34315 38 9V26C38 27.6569 36.6569 29 35 29H5C3.34315 29 2 27.6569 2 26V6Z" fill={isDropped ? '#86efac' : '#5AC8FA'} />
                <path d="M2 10C2 8.34315 3.34315 7 5 7H35C36.6569 7 38 8.34315 38 10V12H2V10Z" fill={isDropped ? '#4ade80' : '#3AA9D9'} opacity="0.9" />
              </svg>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{f.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {f.rows} 行 · {ROLE_LABELS[f.role] ?? f.role}
                </div>
              </div>
              {isDropped && (
                <span style={{ fontSize: '16px', color: '#22c55e' }}>✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 拖拽目标区域 */}
      <div
        data-tour="drop-zone"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          minHeight: '180px',
          border: rejected ? '2px solid #ef4444' : dragOver ? '2px solid #0f766e' : '2px dashed #cbd5e1',
          borderRadius: '12px',
          background: rejected ? '#fef2f2' : dragOver ? '#f0fdfa' : '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          marginBottom: '24px',
        }}
      >
        {rejected ? (
          <>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚫</div>
            <p style={{ fontSize: '15px', color: '#dc2626', fontWeight: 500 }}>
              {isZh ? '网络演示不支持导入真实文件' : 'Web demo does not support importing real files'}
            </p>
            <p style={{ fontSize: '13px', color: '#b91c1c', marginTop: '4px' }}>
              {isZh ? '请下载应用，在本地导入你的表格' : 'Download the app to import your tables locally'}
            </p>
          </>
        ) : dropped.size === 0 ? (
          <>
            <svg width="48" height="38" viewBox="0 0 40 32" fill="none" style={{ marginBottom: '8px', opacity: 0.5 }}>
              <path d="M2 6C2 4.34315 3.34315 3 5 3H14L17 6H35C36.6569 6 38 7.34315 38 9V26C38 27.6569 36.6569 29 35 29H5C3.34315 29 2 27.6569 2 26V6Z" fill="#5AC8FA" />
              <path d="M2 10C2 8.34315 3.34315 7 5 7H35C36.6569 7 38 8.34315 38 10V12H2V10Z" fill="#3AA9D9" opacity="0.9" />
            </svg>
            <p style={{ fontSize: '15px', color: '#9ca3af' }}>
              {t('upload.demoDropHint')}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
            <p style={{ fontSize: '15px', color: '#0f766e', fontWeight: 500 }}>
              已导入 {dropped.size} / {files.length} 份表格
            </p>
            {!allDropped && (
              <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                继续拖入或点击剩余 {files.length - dropped.size} 份
              </p>
            )}
          </>
        )}
      </div>

      {/* 下一步按钮 */}
      <div style={{ textAlign: 'right' }}>
        <button
          data-tour="next-understand"
          disabled={!allDropped}
          onClick={() => navigate('/demo/understand')}
          style={{
            padding: '10px 28px',
            fontSize: '15px',
            fontWeight: 600,
            color: allDropped ? '#fff' : '#9ca3af',
            background: allDropped ? '#0f766e' : '#e5e7eb',
            border: 'none',
            borderRadius: '8px',
            cursor: allDropped ? 'pointer' : 'not-allowed',
          }}
        >
          确认并继续
        </button>
      </div>
    </div>
  );
}
