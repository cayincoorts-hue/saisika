import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoBadge from '../components/demo/DemoBadge';
import { demoAnalysisSource } from '../demo/demoAnalysisSource';
import type { DemoFileSummary } from '../types/analysis';

const ROLE_LABELS: Record<string, string> = {
  node: '节点表',
  fact: '事实表',
  edge: '关系表',
};

export default function UnderstandPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<DemoFileSummary[]>([]);

  useEffect(() => {
    demoAnalysisSource.getFiles().then(setFiles);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '16px' }}>
        文件理解确认 <DemoBadge />
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        先识别"这是什么表"，再判断"表中的数据代表什么"。
      </p>
      <div data-tour="file-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {files.map((f) => (
          <div
            key={f.name}
            data-tour="file-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>{f.name}</span>
              <span style={{ marginLeft: '12px', fontSize: '13px', color: '#6b7280' }}>
                {f.rows} 行 · {f.columns.length} 列
              </span>
            </div>
            <span data-tour="role-summary" style={{
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0f766e',
              background: '#ccfbf1',
              borderRadius: '6px',
            }}>
              {ROLE_LABELS[f.role] ?? f.role}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '32px', textAlign: 'right' }}>
        <button
          data-tour="next-mapping"
          onClick={() => navigate('/demo/mapping')}
          style={{
            padding: '10px 28px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#fff',
            background: '#0f766e',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          确认并继续
        </button>
      </div>
    </div>
  );
}
