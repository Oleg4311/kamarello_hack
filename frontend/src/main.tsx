import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Activity,
  CheckCircle2,
  X,
  Download,
  FileSpreadsheet,
  ScanLine,
  UploadCloud,
  Video,
} from 'lucide-react';
import './styles.css';

type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

type Job = {
  job_id: string;
  status: JobStatus;
  progress: number;
  filename: string;
  rows_count: number;
  metrics: Record<string, unknown>;
  preview_rows: Array<Record<string, unknown>>;
  error?: string | null;
  csv_url?: string | null;
  xlsx_url?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8765';
const RESULT_COLUMNS = [
  'product_name',
  'price_default',
  'price_card',
  'barcode',
  'discount_amount',
  'color',
  'frame_timestamp',
];

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const refreshJob = useCallback(async (jobId: string) => {
    const res = await fetch(`${API_URL}/api/jobs/${jobId}`);
    if (!res.ok) throw new Error(await res.text());
    setJob(await res.json());
  }, []);

  useEffect(() => {
    if (!job || ['done', 'failed'].includes(job.status)) return;
    const timer = window.setInterval(() => {
      refreshJob(job.job_id).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
    }, 900);
    return () => window.clearInterval(timer);
  }, [job, refreshJob]);

  const pick = (selected?: File) => {
    if (!selected) return;
    if (!selected.type.startsWith('video/')) {
      setMessage('Загрузите видеофайл: MP4, MOV, AVI, MKV или WEBM.');
      return;
    }
    setFile(selected);
    setJob(null);
    setMessage('');
  };

  const clearSelection = () => {
    setFile(null);
    setJob(null);
    setMessage('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const upload = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setMessage('');
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/jobs`, {method: 'POST', body: form});
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setJob({
        job_id: created.job_id,
        status: created.status,
        progress: 0,
        filename: file.name,
        rows_count: 0,
        metrics: {},
        preview_rows: [],
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [file]);

  const download = (url?: string | null) => {
    if (url) window.location.href = `${API_URL}${url}`;
  };

  const rows = job?.preview_rows ?? [];
  const stage = job?.status === 'done' ? 'Готово' : job?.status === 'failed' ? 'Ошибка' : job ? 'В обработке' : 'Ожидает видео';

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span>LT</span>
          <div>
            <b>ShelfVision</b>
            <p>React + FastAPI prototype</p>
          </div>
        </div>
        <div className="statusBadge"><Activity size={16}/>{stage}</div>
      </header>

      <section className="layout">
        <aside className="panel uploader">
          <div className="panelTitle">
            <Video size={20}/>
            <h1>Анализ видео с робота</h1>
          </div>
          <input ref={inputRef} type="file" accept="video/*" onChange={(event) => pick(event.target.files?.[0])} hidden/>

          {!file ? (
            <button
              className={drag ? 'dropzone active' : 'dropzone'}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDrag(false);
                pick(event.dataTransfer.files[0]);
              }}
            >
              <UploadCloud size={44}/>
              <strong>Перетащите видео или выберите файл</strong>
              <span>Поддерживаются MP4, MOV, AVI, MKV и WEBM.</span>
            </button>
          ) : (
            <div className="videoPreview">
              <video src={preview} controls/>
              <div className="fileInfo">
                <b>{file.name}</b>
                <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="actions">
                <button onClick={upload} disabled={busy}>{busy ? 'Загрузка...' : 'Запустить анализ'}</button>
                <button className="secondary" onClick={() => inputRef.current?.click()}>Заменить</button>
                <button className="secondary danger" onClick={clearSelection} disabled={busy}><X size={16}/>Очистить</button>
              </div>
            </div>
          )}

          {message && <p className="error">{message}</p>}
          {job?.error && <p className="error">{job.error}</p>}
        </aside>

        <section className="workarea">
          <div className="panel progressPanel">
            <div className="panelTitle">
              <ScanLine size={20}/>
              <h2>Pipeline</h2>
            </div>
            <div className="steps">
              <Step done={!!job} label="Upload"/>
              <Step done={(job?.progress ?? 0) >= 25} label="Sampling"/>
              <Step done={(job?.progress ?? 0) >= 55} label="Detection"/>
              <Step done={(job?.progress ?? 0) >= 85} label="OCR / QR"/>
              <Step done={job?.status === 'done'} label="Export"/>
            </div>
            <div className="progress"><span style={{width: `${job?.progress ?? 0}%`}}/></div>
            <p className="muted">{job ? `${job.filename}: ${job.status}, ${job.progress}%` : 'Задача еще не запущена.'}</p>
          </div>

          <div className="summaryGrid">
            <Metric label="Ценников" value={job?.rows_count ?? '-'}/>
            <Metric label="Уникальных штрихкодов" value={(job?.metrics?.unique_barcodes as number) ?? '-'}/>
            <Metric label="Режим" value={(job?.metrics?.mode as string) ?? '-'}/>
          </div>

          <div className="panel resultPanel">
            <div className="resultHeader">
              <div className="panelTitle">
                <FileSpreadsheet size={20}/>
                <h2>Результат распознавания</h2>
              </div>
              <div className="actions compact">
                <button disabled={job?.status !== 'done'} onClick={() => download(job?.csv_url)}><Download size={16}/>CSV</button>
                <button disabled={job?.status !== 'done'} onClick={() => download(job?.xlsx_url)}><Download size={16}/>XLSX</button>
              </div>
            </div>

            {rows.length ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>{RESULT_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index}>
                        {RESULT_COLUMNS.map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">После завершения анализа здесь появится превью первых строк CSV.</div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Step({done, label}: {done: boolean; label: string}) {
  return <div className={done ? 'step done' : 'step'}><CheckCircle2 size={17}/><span>{label}</span></div>;
}

function Metric({label, value}: {label: string; value: React.ReactNode}) {
  return <div className="metric"><b>{value}</b><span>{label}</span></div>;
}

createRoot(document.getElementById('root')!).render(<App/>);
