import { useNavigate } from 'react-router-dom';
import DemoBadge from '../components/demo/DemoBadge';
import { useDemoTour } from '../demo/useDemoTour';

export default function DemoHomePage() {
  const navigate = useNavigate();
  const { start } = useDemoTour();

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
        Saisca <DemoBadge />
      </h1>
      <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '24px' }}>
        离线供应链风险分析
      </p>
      <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.8', marginBottom: '32px' }}>
        从业务表格到可解释的风险决策。
        <br />
        数据留在本机 · 无需建立复杂模型 · 风险结论可追溯
      </p>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          data-tour="start-demo"
          onClick={() => navigate('/demo/upload')}
          style={{
            padding: '12px 36px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#fff',
            background: '#0f766e',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          开始展示
        </button>
        <button
          data-tour-control="start-tour"
          onClick={start}
          style={{
            padding: '12px 36px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#0f766e',
            background: '#fff',
            border: '2px solid #0f766e',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          自动导览 ▶
        </button>
      </div>
      <p style={{ marginTop: '16px', fontSize: '13px', color: '#9ca3af' }}>
        以下为内置虚拟案例，不上传任何文件
      </p>
    </div>
  );
}
