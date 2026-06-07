import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    <>
      <div className="page-header">
        <h1>{t('upload.title')}</h1>
        <p>{t('upload.step')}</p>
      </div>

      <TopNotice type="error" message={error} />

      <SectionCard>
        <FileDropzone files={files} onChange={setFiles} disabled={uploading} />
      </SectionCard>

      <div className="stagger-item" style={{ '--item-delay': '200ms', textAlign: 'right' } as React.CSSProperties}>
        <button
          className="btn btn-primary btn-lg"
          disabled={files.length === 0 || uploading}
          onClick={handleUpload}
          style={{ minWidth: 160 }}
        >
          {uploading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="loading-spinner" />
              {t('upload.uploading')}
            </span>
          ) : (
            t('upload.filesSelected', { count: files.length })
          )}
        </button>
      </div>
    </>
  );
}
