import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import SectionCard from '../components/layout/SectionCard';
import FileDropzone from '../components/upload/FileDropzone';
import TopNotice from '../components/layout/TopNotice';
import { uploadFiles } from '../utils/api';

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('请先选择文件');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const result = await uploadFiles(files);
      if (result.errors?.length > 0) {
        setError(result.errors.map((e: any) => e.error || e.file).join('；'));
      }
      if (result.batch_id) {
        navigate(`/confirm/${result.batch_id}`);
      }
    } catch (err: any) {
      setError(err?.detail?.errors?.map((e: any) => e.error).join('；') || err?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageShell>
      <div className="page-header">
        <h1>Saisca</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          步骤 1/3：导入数据
          {' · '}
          <button
            className="btn btn-outline"
            onClick={() => navigate('/history')}
            style={{ padding: '2px 10px', fontSize: '0.8rem' }}
          >
            历史记录
          </button>
        </span>
      </div>

      <TopNotice type="error" message={error} />

      <SectionCard title="上传数据文件" delay={140}>
        <FileDropzone files={files} onChange={setFiles} disabled={uploading} />
      </SectionCard>

      <div className="stagger-item" style={{ '--item-delay': '280ms', textAlign: 'right' } as CSSProperties}>
        <button
          className="btn btn-primary"
          disabled={files.length === 0 || uploading}
          onClick={handleUpload}
          style={{ minWidth: 140 }}
        >
          {uploading ? (
            <span><span className="loading-spinner" style={{ marginRight: 8 }} />上传中...</span>
          ) : (
            `上传并继续 (${files.length} 个文件)`
          )}
        </button>
      </div>
    </PageShell>
  );
}
