const API_BASE = '/api';

export async function uploadFiles(files: File[]): Promise<{ batch_id: string; saved_files: string[]; errors: any[] }> {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw await res.json();
  return res.json();
}

export function analyzeSSE(batchId: string, onProgress: (data: any) => void, onText: (data: any) => void, onComplete: () => void, onError: (msg: string) => void): AbortController {
  const controller = new AbortController();
  fetch(`${API_BASE}/analyze?batch_id=${batchId}`, { method: 'POST', signal: controller.signal })
    .then(async res => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7).trim();
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                if (event === 'progress') onProgress(data);
                else if (event === 'text') onText(data);
                else if (event === 'complete') onComplete();
                else if (event === 'error') onError(data.message || 'Unknown error');
              } catch {}
            }
          }
        }
      }
    })
    .catch(err => { if (err.name !== 'AbortError') onError(err.message); });
  return controller;
}

export async function getResults(batchId: string) {
  const res = await fetch(`${API_BASE}/results/${batchId}`);
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getHistory() {
  const res = await fetch(`${API_BASE}/history`);
  return res.json();
}

export async function deleteHistory(batchId: string) {
  await fetch(`${API_BASE}/history/${batchId}`, { method: 'DELETE' });
}

export async function getNodeDetail(nodeId: string, batchId?: string) {
  const url = batchId ? `${API_BASE}/nodes/${nodeId}?batch_id=${batchId}` : `${API_BASE}/nodes/${nodeId}`;
  const res = await fetch(url);
  if (!res.ok) throw await res.json();
  return res.json();
}
