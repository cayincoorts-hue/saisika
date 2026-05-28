import { useState, useEffect, type FormEvent, type CSSProperties } from 'react';

interface Props {
  onActivated: () => void;
}

export default function ActivatePage({ onActivated }: Props) {
  const [machineId, setMachineId] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/license/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.activated) {
          onActivated();
        } else {
          setMachineId(data.machine_id || '');
        }
      })
      .catch(() => setError('无法连接到后端服务'))
      .finally(() => setChecking(false));
  }, [onActivated]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || '激活成功');
        setTimeout(() => onActivated(), 800);
      } else {
        setError(data.detail || '激活失败');
      }
    } catch {
      setError('网络错误，请确认后端服务是否正常运行。');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyInput = (value: string) => {
    // 只允许字母数字，自动格式化为 XXXX-XXXX-XXXX-XXXX
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16);
    const groups: string[] = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      groups.push(cleaned.slice(i, i + 4));
    }
    setKey(groups.join('-'));
  };

  if (checking) {
    return (
      <div style={centeredStyle}>
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        <p style={{ marginTop: 16, color: 'var(--color-muted)' }}>正在检查激活状态...</p>
      </div>
    );
  }

  return (
    <div style={centeredStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8, fontWeight: 600 }}>Saisca</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: 24 }}>
          供应链风险分析系统 · 产品激活
        </p>

        <div style={machineIdBoxStyle}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>机器 ID</span>
          <code style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-mono)', userSelect: 'all' }}>
            {machineId || '—'}
          </code>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>
            激活码
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => handleKeyInput(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoFocus
            style={inputStyle}
            maxLength={22}
          />

          {error && (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-error)', marginTop: 10, lineHeight: 1.6 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-ok)', marginTop: 10 }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || key.length < 19}
            className="btn btn-primary"
            style={{ marginTop: 18, width: '100%' }}
          >
            {loading ? '验证中...' : '激活'}
          </button>
        </form>

        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 20, textAlign: 'center' }}>
          请将机器 ID 发送给供应商以获取激活码
        </p>
      </div>
    </div>
  );
}

const centeredStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: '#f0f2f5',
  fontFamily: 'Inter, -apple-system, sans-serif',
};

const cardStyle: CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: '40px 36px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  maxWidth: 420,
  width: '100%',
};

const machineIdBoxStyle: CSSProperties = {
  background: '#f8f9fa',
  borderRadius: 8,
  padding: '12px 16px',
  marginBottom: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '1rem',
  fontFamily: 'var(--font-mono), monospace',
  border: '1px solid var(--color-hairline, #ddd)',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
  letterSpacing: '1px',
};
