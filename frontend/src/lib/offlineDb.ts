// IndexedDB wrapper for offline data storage

const DB_NAME = 'nexus_offline';
const DB_VERSION = 1;

interface OfflineAction {
  id?: number;
  type: 'labor_start' | 'labor_stop' | 'labor_pause' | 'labor_resume' | 'labor_update';
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  createdAt: string;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cached_data')) {
        const store = db.createObjectStore('cached_data', { keyPath: 'key' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Queue an API action for later sync
export async function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'retries'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readwrite');
    tx.objectStore('pending_actions').add({ ...action, retries: 0 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get all pending actions
export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readonly');
    const request = tx.objectStore('pending_actions').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove a synced action
export async function removePendingAction(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readwrite');
    tx.objectStore('pending_actions').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Update retry count
export async function incrementRetry(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readwrite');
    const store = tx.objectStore('pending_actions');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const action = getReq.result;
      if (action) {
        action.retries = (action.retries || 0) + 1;
        store.put(action);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Cache API response data for offline reading
export async function cacheData(key: string, data: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_data', 'readwrite');
    tx.objectStore('cached_data').put({ key, data, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_data', 'readonly');
    const request = tx.objectStore('cached_data').get(key);
    request.onsuccess = () => resolve(request.result?.data ?? null);
    request.onerror = () => reject(request.error);
  });
}

// Get pending action count
export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readonly');
    const request = tx.objectStore('pending_actions').count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clear all pending actions
export async function clearPendingActions(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readwrite');
    tx.objectStore('pending_actions').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
