import { useState, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileDropzone({ files, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const [dragover, setDragover] = useState(false);
  const counterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current++;
    if (!disabled) setDragover(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current--;
    if (counterRef.current <= 0) {
      counterRef.current = 0;
      setDragover(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current = 0;
    setDragover(false);
    if (disabled) return;

    const items = e.dataTransfer.items;
    const newFiles: File[] = [];

    if (items) {
      const processEntry = (entry: FileSystemEntry): Promise<File[]> => {
        return new Promise(resolve => {
          if (entry.isFile) {
            (entry as FileSystemFileEntry).file(file => resolve([file]));
          } else if (entry.isDirectory) {
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            reader.readEntries(entries => {
              Promise.all(entries.map(processEntry)).then(results => resolve(results.flat()));
            });
          } else {
            resolve([]);
          }
        });
      };

      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          entries.push(entry);
        } else {
          const file = items[i].getAsFile();
          if (file) newFiles.push(file);
        }
      }

      if (entries.length > 0) {
        Promise.all(entries.map(processEntry)).then(results => {
          onChange([...files, ...results.flat(), ...newFiles]);
        });
        return;
      }
    }

    const dropped = Array.from(e.dataTransfer.files || []);
    onChange([...files, ...dropped]);
  }, [files, onChange, disabled]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const selected = Array.from(e.target.files || []);
    onChange([...files, ...selected]);
    e.target.value = '';
  }, [files, onChange, disabled]);

  const removeFile = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        className={`upload-dropzone ${dragover ? 'is-active' : ''}`}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        } as CSSProperties}
      >
        <div className="upload-dropzone-icon">
          {dragover ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
          )}
        </div>
        <p className="upload-dropzone-text">
          {dragover ? t('upload.dropHere') : t('upload.dragDrop')}
        </p>
        <p className="upload-dropzone-hint">
          {t('upload.supportedFormats')} · {t('upload.maxFileSize')} · {t('upload.maxFileCount')}
        </p>
        <label className="btn btn-outline" style={{ display: 'inline-flex', marginTop: 8 }}>
          {t('upload.selectFile')}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={handleSelect}
            style={{ display: 'none' }}
            disabled={disabled}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="file-list stagger-item" style={{ '--item-delay': '120ms' } as CSSProperties}>
          <div className="file-list-header">
            <span className="file-list-count">
              {t('upload.filesSelected', { count: files.length })}
            </span>
            <button
              onClick={() => onChange([])}
              style={{
                border: 'none', background: 'none',
                color: 'var(--color-error)', fontSize: 'var(--text-xs)',
                cursor: 'pointer', fontWeight: 500,
                fontFamily: 'var(--font-body)',
              }}
              disabled={disabled}
            >
              {t('upload.clearAll')}
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {files.map((f, i) => (
              <div
                key={`${f.name}-${f.size}-${i}`}
                className="file-item stagger-item"
                style={{ '--item-delay': `${120 + i * 50}ms` } as CSSProperties}
              >
                <span className="file-item-name">
                  <span className="file-item-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </span>
                  <span>{f.name}</span>
                </span>
                <span className="file-item-size">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  className="file-item-remove"
                  onClick={() => removeFile(i)}
                  disabled={disabled}
                  title={t('common.delete')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
