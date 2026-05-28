import { useState, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileDropzone({ files, onChange, disabled }: Props) {
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
      // 支持文件夹拖入（递归读取）
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
          // 兼容不支持 webkitGetAsEntry 的浏览器
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

    // fallback：不支持 items 时用 files
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

  const borderColor = dragover ? 'var(--color-accent)' : 'var(--color-border)';
  const bgColor = dragover ? 'rgba(52,152,219,0.06)' : 'var(--color-bg-page)';

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
          border: `2px dashed ${borderColor}`,
          borderRadius: 'var(--radius)',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.7s var(--motion-smooth), background 0.7s var(--motion-smooth), transform 0.7s var(--motion-smooth), box-shadow 0.7s var(--motion-smooth)',
          background: bgColor,
        } as CSSProperties}
      >
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', margin: 0, position: 'relative' }}>
          {dragover ? '松开鼠标以上传文件' : '拖拽 CSV/Excel 文件或文件夹到此处'}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '8px 0', position: 'relative' }}>
          支持 .csv / .xlsx / .xls，可同时拖入整个文件夹
        </p>
        <label className="btn btn-outline" style={{ display: 'inline-block', marginTop: 12 }}>
          或点击选择文件
          <input type="file" accept=".csv,.xlsx,.xls" multiple onChange={handleSelect}
                 style={{ display: 'none' }} disabled={disabled} />
        </label>
      </div>
      {files.length > 0 && (
        <div className="stagger-item" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>已选择 {files.length} 个文件</span>
            <button
              onClick={() => onChange([])}
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                color: 'var(--color-error)', fontSize: '0.85rem'
              }}
              disabled={disabled}
            >
              清空全部
            </button>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {files.map((f, i) => (
              <div
                key={`${f.name}-${f.size}-${i}`}
                className="stagger-item"
                style={{
                  '--item-delay': `${i * 70}ms`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 12px', background: 'var(--color-bg-card)', borderRadius: 6, marginBottom: 4,
                  transition: 'transform 0.65s var(--motion-smooth), background 0.65s var(--motion-smooth)',
                } as CSSProperties}
              >
                <span style={{ fontSize: '0.9rem' }}>{f.name} <span style={{ color: 'var(--color-unavailable)' }}>{(f.size / 1024).toFixed(0)} KB</span></span>
                <button onClick={() => removeFile(i)} style={{ border: 'none', background: 'none', cursor: 'pointer',
                  color: 'var(--color-error)', fontSize: '1.2rem' }} disabled={disabled}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
