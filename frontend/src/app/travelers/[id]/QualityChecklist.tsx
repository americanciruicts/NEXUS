'use client';
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';

interface CheckItem { id: number; check_name: string; description: string | null; sort_order: number; is_required: boolean; passed: boolean | null; checked_by: number | null; checked_at: string | null; fail_note: string | null; }

export default function QualityChecklist({ stepId, isEditing }: { stepId: number; isEditing: boolean }) {
  const [items, setItems] = useState<CheckItem[]>([]);
  const [newName, setNewName] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : '';
  const headers: Record<string, string> = { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' };

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/features/quality/${stepId}`, { headers });
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
  };
  useEffect(() => { fetchItems(); }, [stepId]);

  const addItem = async () => {
    if (!newName.trim()) return;
    await fetch(`${API_BASE_URL}/features/quality/${stepId}`, {
      method: 'POST', headers, body: JSON.stringify({ check_name: newName.trim(), sort_order: items.length }),
    });
    setNewName(''); fetchItems();
  };

  const toggleCheck = async (id: number, current: boolean | null) => {
    const next = current === true ? false : current === false ? null : true;
    await fetch(`${API_BASE_URL}/features/quality/check/${id}`, {
      method: 'PUT', headers, body: JSON.stringify({ passed: next }),
    });
    fetchItems();
  };

  const deleteItem = async (id: number) => {
    await fetch(`${API_BASE_URL}/features/quality/check/${id}`, { method: 'DELETE', headers });
    fetchItems();
  };

  if (items.length === 0 && !isEditing) return null;

  return (
    <div className="mt-1">
      {items.length > 0 && (
        <div className="space-y-0.5">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-1.5 text-[10px]">
              <button onClick={() => toggleCheck(item.id, item.passed)}
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  item.passed === true ? 'bg-green-500 border-green-500 text-white' :
                  item.passed === false ? 'bg-red-500 border-red-500 text-white' :
                  'border-gray-300 dark:border-slate-500'
                }`}>
                {item.passed === true ? '✓' : item.passed === false ? '✗' : ''}
              </button>
              <span className={`flex-1 ${item.passed === false ? 'text-red-600 line-through' : 'text-gray-700 dark:text-slate-300'}`}>
                {item.check_name}{item.is_required && <span className="text-red-400">*</span>}
              </span>
              {item.passed === false && item.fail_note && <span className="text-red-500 italic truncate max-w-[100px]">{item.fail_note}</span>}
              {isEditing && <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600">x</button>}
            </div>
          ))}
        </div>
      )}
      {isEditing && (
        <div className="flex items-center gap-1 mt-1">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add check item..." className="flex-1 text-[10px] border rounded px-1.5 py-0.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          <button onClick={addItem} className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600">+</button>
        </div>
      )}
    </div>
  );
}
