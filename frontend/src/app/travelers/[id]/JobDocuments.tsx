'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/config/api';

interface Doc { id: number; original_name: string; file_size: number | null; content_type: string | null; category: string; note: string | null; created_at: string; }

// A rendered preview of an uploaded document. Images render natively; PDFs are
// rasterized page-by-page (client-side via pdf.js) into PNG data URLs so they
// print exactly as uploaded. Anything else is listed but not previewable.
interface Preview { id: number; name: string; category: string; kind: 'image' | 'pdf' | 'other'; images: string[]; error?: boolean; }

// Rasterize every page of a PDF to PNG data URLs. pdf.js is imported lazily so
// it never runs during SSR and only loads when a PDF actually needs rendering.
async function rasterizePdf(buf: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  // Bundle the worker alongside the app (offline-safe, no CDN dependency).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const max = Math.min(pdf.numPages, 50); // safety cap on very large PDFs
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 }); // 2x for crisp print
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL('image/png'));
  }
  return pages;
}

export default function JobDocuments({ travelerId }: { travelerId: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('general');
  const [previews, setPreviews] = useState<Preview[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : '';
  const headers = { Authorization: `Bearer ${token || ''}` };

  const fetch_docs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/features/documents/${travelerId}`, { headers });
      if (res.ok) setDocs(await res.json());
    } catch { /* silent */ }
  };
  useEffect(() => { fetch_docs(); }, [travelerId]);

  // Build inline previews whenever the document list changes. Object URLs are
  // tracked so we can revoke them on cleanup and avoid leaking blob memory.
  const buildPreviews = useCallback(async () => {
    const objectUrls: string[] = [];
    const built: Preview[] = await Promise.all(docs.map(async (d): Promise<Preview> => {
      const ct = (d.content_type || '').toLowerCase();
      const isImage = ct.startsWith('image/');
      const isPdf = ct === 'application/pdf' || (d.original_name || '').toLowerCase().endsWith('.pdf');
      if (!isImage && !isPdf) return { id: d.id, name: d.original_name, category: d.category, kind: 'other', images: [] };
      try {
        const res = await fetch(`${API_BASE_URL}/features/documents/file/${d.id}/raw`, { headers });
        if (!res.ok) throw new Error('fetch failed');
        if (isImage) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          return { id: d.id, name: d.original_name, category: d.category, kind: 'image', images: [url] };
        }
        const pages = await rasterizePdf(await res.arrayBuffer());
        return { id: d.id, name: d.original_name, category: d.category, kind: 'pdf', images: pages };
      } catch {
        return { id: d.id, name: d.original_name, category: d.category, kind: isPdf ? 'pdf' : 'image', images: [], error: true };
      }
    }));
    setPreviews(built);
    return objectUrls;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  useEffect(() => {
    let urls: string[] = [];
    buildPreviews().then(u => { urls = u; });
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [buildPreviews]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      await fetch(`${API_BASE_URL}/features/documents/${travelerId}`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: fd });
      fetch_docs();
    } catch { /* silent */ }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    await fetch(`${API_BASE_URL}/features/documents/file/${id}`, { method: 'DELETE', headers });
    fetch_docs();
  };

  const fmtSize = (b: number | null) => { if (!b) return ''; if (b < 1024) return `${b}B`; if (b < 1048576) return `${(b/1024).toFixed(1)}KB`; return `${(b/1048576).toFixed(1)}MB`; };

  return (
    <div className="border-b-2 border-black dark:border-slate-600">
      {/* Header + upload/list/delete — management UI, screen only */}
      <div className="screen-only">
        <div className="bg-teal-200 dark:bg-teal-900/50 px-3 py-2 flex items-center justify-between">
          <h2 className="font-bold text-sm text-teal-900 dark:text-teal-200">DOCUMENTS</h2>
          <div className="flex items-center gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="text-xs border rounded px-1 py-0.5 dark:bg-slate-700 dark:text-white dark:border-slate-600">
              <option value="general">General</option><option value="drawing">Drawing</option>
              <option value="spec">Spec</option><option value="quality">Quality</option><option value="customer">Customer</option>
            </select>
            <label className="text-xs bg-teal-700 text-white px-2 py-1 rounded cursor-pointer hover:bg-teal-800">
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>
        <div className="bg-teal-50 dark:bg-slate-800 p-3 min-h-[40px]">
          {docs.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No documents attached</p>
          ) : (
            <div className="space-y-1">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-xs bg-white dark:bg-slate-700 rounded px-2 py-1.5 border border-gray-200 dark:border-slate-600">
                  <span className="font-semibold text-gray-700 dark:text-slate-300 flex-1 truncate">{d.original_name}</span>
                  <span className="text-gray-400">{fmtSize(d.file_size)}</span>
                  <span className="text-gray-400 bg-gray-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[10px]">{d.category}</span>
                  <span className="text-gray-400">{new Date(d.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 font-bold">x</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rendered documents — visible on screen AND printed, exactly as uploaded */}
      {previews.length > 0 && (
        <div>
          <div className="bg-teal-200 dark:bg-teal-900/50 print:!bg-teal-200 px-3 py-2 print:px-1 print:py-0 border-t-2 border-black dark:border-slate-600 print:break-before-page">
            <h2 className="font-bold text-sm text-teal-900 dark:text-teal-200 print:!text-black print:text-[10px]">ATTACHED DOCUMENTS</h2>
          </div>
          <div className="bg-white p-3 print:p-0">
            {previews.map(p => (
              <div key={p.id} className="mb-4 print:mb-0 print:break-before-page print:break-inside-avoid">
                <div className="text-xs font-semibold text-gray-600 dark:text-slate-300 print:text-black mb-1 print:text-[9px]">
                  {p.name}{p.category && p.category !== 'general' ? ` (${p.category})` : ''}
                </div>
                {p.error ? (
                  <div className="text-xs text-red-600 italic">Could not load this document for preview.</div>
                ) : p.kind === 'other' ? (
                  <div className="text-xs text-gray-500 italic print:text-black">Attached file (not previewable inline): {p.name}</div>
                ) : p.images.length === 0 ? (
                  <div className="text-xs text-gray-400 italic screen-only">Rendering…</div>
                ) : (
                  p.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`${p.name} — page ${i + 1}`}
                      className="w-full h-auto border border-gray-300 dark:border-slate-600 print:border-0 mb-3 print:mb-0 print:break-inside-avoid"
                      style={{ pageBreakInside: 'avoid' }}
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
