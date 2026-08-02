import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoBadge from '../components/demo/DemoBadge';
import { demoAnalysisSource } from '../demo/demoAnalysisSource';
import type { FieldMapping } from '../types/analysis';

const STATUS_LABELS: Record<string, string> = {
  identified: '已识别',
  uncertain: '待确认',
  unmapped: '未映射',
};

export default function MappingPage() {
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    demoAnalysisSource.getMappings().then(setMappings);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '16px' }}>
        字段映射确认 <DemoBadge />
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        自动映射不是黑箱；每一项判断都可以查看和确认。
      </p>
      <table data-tour="mapping-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '14px', color: '#6b7280' }}>原始列名</th>
            <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '14px', color: '#6b7280' }}>映射字段</th>
            <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '14px', color: '#6b7280' }}>状态</th>
            <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '14px', color: '#6b7280' }}>置信度</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.originalColumn} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{m.originalColumn}</td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{m.mappedField}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: m.status === 'identified' ? '#0f766e' : '#d97706',
                  background: m.status === 'identified' ? '#ccfbf1' : '#fef3c7',
                  borderRadius: '4px',
                }}>
                  {STATUS_LABELS[m.status] ?? m.status}
                </span>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                {Math.round(m.confidence * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '32px', textAlign: 'right' }}>
        <button
          data-tour="confirm-analyze"
          onClick={() => navigate('/demo/analyze')}
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
          确认并分析
        </button>
      </div>
    </div>
  );
}
