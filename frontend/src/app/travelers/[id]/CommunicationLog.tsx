'use client';
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';

interface CommEntry { id: number; comm_type: string; direction: string; subject: string | null; message: string; contact_name: string | null; created_by: number | null; created_at: string; }

const TYPE_COLORS: Record<string, string> = {
  note: 'bg-gray-100 text-gray-700', email: 'bg-blue-100 text-blue-700',
  phone: 'bg-green-100 text-green-700', meeting: 'bg-purple-100 text-purple-700',
};
const DIR_ICONS: Record<string, string> = { internal: '📋', outbound: '📤', inbound: '📥' };

export default function CommunicationLogSection({ travelerId }: { travelerId: number }) {
  const [entries, setEntries] = useState<CommEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ comm_type: 'note', direction: 'internal', subject: '', message: '', contact_name: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : '';
  const headers: Record<string, string> = { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' };

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/features/comms/${travelerId}`, { headers });
      if (res.ok) setEntries(await res.json());
    } catch { /* silent */ }
  };
  useEffect(() => { fetchEntries(); }, [travelerId]);

  const handleSubmit = async () => {
    if (!form.message.trim()) return;
    await fetch(`${API_BASE_URL}/features/comms/${travelerId}`, {
      method: 'POST', headers, body: JSON.stringify(form),
    });
    setForm({ comm_type: 'note', direction: 'internal', subject: '', message: '', contact_name: '' });
    setShowForm(false); fetchEntries();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`${API_BASE_URL}/features/comms/entry/${id}`, { method: 'DELETE', headers });
    fetchEntries();
  };

  return (
    <div className="screen-only border-b-2 border-black dark:border-slate-600">
      <div className="bg-indigo-200 dark:bg-indigo-900/50 px-3 py-2 flex items-center justify-between">
        <h2 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">COMMUNICATION LOG</h2>
        <button onClick={() => setShowForm(!showForm)} className="text-xs bg-indigo-700 text-white px-2 py-1 rounded hover:bg-indigo-800">
          {showForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>
      <div className="bg-indigo-50 dark:bg-slate-800 p-3">
        {showForm && (
          <div className="mb-3 p-2 bg-white dark:bg-slate-700 rounded border border-indigo-200 dark:border-slate-600 space-y-2">
            <div className="flex gap-2">
              <select value={form.comm_type} onChange={e => setForm(f => ({...f, comm_type: e.target.value}))} className="text-xs border rounded px-1.5 py-1 dark:bg-slate-600 dark:text-white dark:border-slate-500">
                <option value="note">Note</option><option value="email">Email</option>
                <option value="phone">Phone</option><option value="meeting">Meeting</option>
              </select>
              <select value={form.direction} onChange={e => setForm(f => ({...f, direction: e.target.value}))} className="text-xs border rounded px-1.5 py-1 dark:bg-slate-600 dark:text-white dark:border-slate-500">
                <option value="internal">Internal</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option>
              </select>
              <input value={form.contact_name} onChange={e => setForm(f => ({...f, contact_name: e.target.value}))}
                placeholder="Contact name..." className="flex-1 text-xs border rounded px-1.5 py-1 dark:bg-slate-600 dark:text-white dark:border-slate-500" />
            </div>
            <input value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
              placeholder="Subject (optional)..." className="w-full text-xs border rounded px-1.5 py-1 dark:bg-slate-600 dark:text-white dark:border-slate-500" />
            <textarea value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))}
              placeholder="Message..." className="w-full text-xs border rounded px-1.5 py-1 min-h-[60px] dark:bg-slate-600 dark:text-white dark:border-slate-500" />
            <button onClick={handleSubmit} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Save</button>
          </div>
        )}
        {entries.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No communication entries yet</p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {entries.map(e => (
              <div key={e.id} className="bg-white dark:bg-slate-700 rounded px-2.5 py-2 border border-gray-200 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">{DIR_ICONS[e.direction] || '📋'}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[e.comm_type] || TYPE_COLORS.note} dark:opacity-80`}>{e.comm_type}</span>
                  {e.subject && <span className="text-[11px] font-semibold text-gray-800 dark:text-slate-200">{e.subject}</span>}
                  <span className="text-[10px] text-gray-400 ml-auto">{new Date(e.created_at).toLocaleString()}</span>
                  <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">x</button>
                </div>
                {e.contact_name && <p className="text-[10px] text-gray-500 dark:text-slate-400">Contact: {e.contact_name}</p>}
                <p className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{e.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
