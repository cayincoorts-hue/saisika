import { useState, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

const FILE_ICONS: Record<string, string> = {
  csv: '📊',
  xlsx: '📈',
  xls: '📈',
};

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
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
            (entry as FileSystemFileEntry).file(file => {
              resolve([file]);
            });
          } else if (entry.isDirectory) {
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            reader.readEntries(entries => {
              Promise.all(entries.map(processEntry)).then(results => {
                resolve(results.flat());
              });
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
          const all = [...files, ...results.flat(), ...newFiles];
          onChange(all);
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

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--cursor-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--cursor-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div>
      <div
        className={`lux-hover upload-dropzone ${dragover ? 'is-active' : ''}`}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onPointerMove={handlePointerMove}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        } as CSSProperties}
      >
        <span className="upload-dropzone-icon">
          {dragover ? '📥' : '📂'}
        </span>
        <p className="upload-dropzone-text">
          {dragover ? t('upload.dropHere') : t('upload.dragDrop')}
        </p>
        <p className="upload-dropzone-hint">
          {t('upload.supportedFormats')}
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
              className="btn-ghost"
              style={{
                border: 'none', background: 'none',
                color: 'var(--color-error)', fontSize: 'var(--text-xs)',
                cursor: 'pointer', fontWeight: 500,
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
                style={{
                  '--item-delay': `${120 + i * 50}ms`,
                } as CSSProperties}
              >
                <span className="file-item-name">
                  <span className="file-item-icon">{fileIcon(f.name)}</span>
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
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
