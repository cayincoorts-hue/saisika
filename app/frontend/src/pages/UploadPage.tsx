import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageShell from '../components/layout/PageShell';
import SectionCard from '../components/layout/SectionCard';
import FileDropzone from '../components/upload/FileDropzone';
import TopNotice from '../components/layout/TopNotice';
import { uploadFiles } from '../utils/api';

export default function UploadPage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (files.length === 0) {
      setError(t('upload.selectFile'));
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
      setError(err?.detail?.errors?.map((e: any) => e.error).join('；') || err?.message || t('upload.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageShell>
      <div className="page-header">
        <h1>Saisca</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          {t('upload.step')}
          {' · '}
          <button
            className="btn btn-outline"
            onClick={() => navigate('/history')}
            style={{ padding: '2px 10px', fontSize: '0.8rem' }}
          >
            {t('history.title')}
          </button>
        </span>
      </div>

      <TopNotice type="error" message={error} />

      <SectionCard title={t('upload.title')} delay={140}>
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
            <span><span className="loading-spinner" style={{ marginRight: 8 }} />{t('upload.uploading')}</span>
          ) : (
            t('upload.filesSelected', { count: files.length })
          )}
        </button>
      </div>
    </PageShell>
  );
}
