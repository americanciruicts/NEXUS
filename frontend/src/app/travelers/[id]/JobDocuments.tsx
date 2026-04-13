'use client';
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';

interface Doc { id: number; original_name: string; file_size: number | null; content_type: string | null; category: string; note: string | null; created_at: string; }

export default function JobDocuments({ travelerId }: { travelerId: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('general');

  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : '';
  const headers = { Authorization: `Bearer ${token || ''}` };

  const fetch_docs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/features/documents/${travelerId}`, { headers });
      if (res.ok) setDocs(await res.json());
    } catch { /* silent */ }
  };
  useEffect(() => { fetch_docs(); }, [travelerId]);

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
    <div className="screen-only border-b-2 border-black dark:border-slate-600">
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
  );
}
