'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/context/AuthContext';

interface Doc { id: number; original_name: string; file_size: number | null; content_type: string | null; category: string; note: string | null; created_at: string; }

// A rendered preview of an uploaded document. Images render natively; PDFs are
// rasterized page-by-page (client-side via pdf.js) into PNG data URLs so they
// print exactly as uploaded. blobUrl is always kept so the document can be
// opened/embedded even if inline rendering fails.
interface Preview { id: number; name: string; category: string; kind: 'image' | 'pdf' | 'other'; images: string[]; blobUrl?: string; error?: boolean; }

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

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
      const name = (d.original_name || '').toLowerCase();
      // Detect by content-type OR file extension — uploads sometimes have a
      // missing/generic content type, which previously hid the document.
      const isImage = ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
      const isPdf = ct === 'application/pdf' || name.endsWith('.pdf');
      const kind: Preview['kind'] = isImage ? 'image' : isPdf ? 'pdf' : 'other';
      try {
        const res = await fetch(`${API_BASE_URL}/features/documents/file/${d.id}/raw`, { headers });
        if (!res.ok) throw new Error('fetch failed');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        objectUrls.push(blobUrl);
        let images: string[] = [];
        if (kind === 'image') {
          images = [blobUrl];
        } else if (kind === 'pdf') {
          // Rasterize for an exact-as-uploaded print. If pdf.js fails (e.g.
          // worker issue), images stays empty and we fall back to an embed.
          try { images = await rasterizePdf(await blob.arrayBuffer()); } catch { images = []; }
        }
        return { id: d.id, name: d.original_name, category: d.category, kind, images, blobUrl };
      } catch {
        return { id: d.id, name: d.original_name, category: d.category, kind, images: [], error: true };
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
    if (!travelerId || travelerId <= 0) {
      toast.error('Save the traveler before uploading documents.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      const res = await fetch(`${API_BASE_URL}/features/documents/${travelerId}`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: fd });
      if (res.ok) {
        toast.success(`Uploaded ${file.name}`);
        fetch_docs();
      } else if (res.status === 413) {
        toast.error(`${file.name} is too large to upload.`);
      } else if (res.status === 401) {
        toast.error('Session expired — please log in again.');
      } else {
        toast.error(`Upload failed (HTTP ${res.status}).`);
      }
    } catch {
      toast.error('Upload failed — network error.');
    }
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
          {isAdmin ? (
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
          ) : (
            <span className="text-[10px] text-teal-800 dark:text-teal-300">View only</span>
          )}
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
                  {isAdmin && <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 font-bold">x</button>}
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
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300 print:text-black mb-1 print:text-[9px]">
                  <span>{p.name}{p.category && p.category !== 'general' ? ` (${p.category})` : ''}</span>
                  {p.blobUrl && (
                    <a href={p.blobUrl} target="_blank" rel="noreferrer" className="screen-only text-teal-700 hover:underline font-normal">Open ↗</a>
                  )}
                </div>
                {p.error ? (
                  <div className="text-xs text-red-600 italic">Could not load this document.{p.blobUrl ? ' Use “Open ↗”.' : ''}</div>
                ) : p.kind === 'image' && p.images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-auto border border-gray-300 dark:border-slate-600 print:border-0 print:break-inside-avoid"
                    style={{ pageBreakInside: 'avoid' }}
                  />
                ) : p.kind === 'pdf' && p.images.length > 0 ? (
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
                ) : p.kind === 'pdf' && p.blobUrl ? (
                  // pdf.js rasterization unavailable — embed so it's at least
                  // visible on screen (note: embeds may not appear in print).
                  <>
                    <iframe src={p.blobUrl} title={p.name} className="screen-only w-full h-[600px] border border-gray-300 dark:border-slate-600" />
                    <div className="print-only text-xs text-gray-600">PDF attached: {p.name} (open digitally to view).</div>
                  </>
                ) : p.kind === 'other' ? (
                  <div className="text-xs text-gray-500 italic print:text-black">Attached file: {p.name}{p.blobUrl ? ' — use “Open ↗” to view/download.' : ''}</div>
                ) : (
                  <div className="text-xs text-gray-400 italic screen-only">Rendering…</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
