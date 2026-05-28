import type { CSSProperties } from 'react';

interface Props {
  batchId: string;
  hasResults: boolean;
}

export default function DownloadPanel({ batchId, hasResults }: Props) {
  return (
    <div className="card reveal-card" style={{ '--reveal-delay': '860ms' } as CSSProperties}>
      <div className="card-title">下载与导出</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a
          href={`/api/results/${batchId}`}
          className={`btn ${hasResults ? 'btn-primary' : 'btn-outline'}`}
          style={{ textDecoration: 'none', display: 'inline-block', pointerEvents: hasResults ? 'auto' : 'none', opacity: hasResults ? 1 : 0.5 }}
          download
        >
          下载分析结果 (JSON)
        </a>
        <button className="btn btn-outline" disabled>
          导出 HTML 报告（即将支持）
        </button>
        <button className="btn btn-outline" disabled>
          导出 Excel（即将支持）
        </button>
      </div>
    </div>
  );
}
