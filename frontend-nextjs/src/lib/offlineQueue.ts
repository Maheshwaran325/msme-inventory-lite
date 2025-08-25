'use client';

import { getSessionToken } from './supabaseClient';

export type QueuedEdit = {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: unknown;
  status: 'queued' | 'syncing' | 'synced' | 'error';
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = 'offline-edit-queue';
const OFFLINE_UNTIL_KEY = 'offline-simulated-until';

let inMemoryQueue: QueuedEdit[] = [];
let isProcessing = false;

function loadQueue() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      inMemoryQueue = JSON.parse(raw) as QueuedEdit[];
    }
  } catch {}
}

function persistQueue() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryQueue));
    }
  } catch {}
}

export function getQueue(): QueuedEdit[] {
  return inMemoryQueue.slice();
}

export function isSimulatedOffline(): boolean {
  if (typeof window === 'undefined') return false;
  const until = Number(window.localStorage.getItem(OFFLINE_UNTIL_KEY) || '0');
  return Date.now() < until;
}

export function setSimulatedOffline(seconds: number) {
  if (typeof window === 'undefined') return;
  const until = Date.now() + seconds * 1000;
  window.localStorage.setItem(OFFLINE_UNTIL_KEY, String(until));
}

export async function enqueueEdit(edit: Omit<QueuedEdit, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const item: QueuedEdit = {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    status: 'queued',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    ...edit,
  };
  inMemoryQueue.push(item);
  persistQueue();
  processQueue();
  return item.id;
}

function updateItem(id: string, partial: Partial<QueuedEdit>) {
  const idx = inMemoryQueue.findIndex(i => i.id === id);
  if (idx >= 0) {
    inMemoryQueue[idx] = { ...inMemoryQueue[idx], ...partial, updatedAt: Date.now() };
    persistQueue();
  }
}

function backoffDelay(attempts: number) {
  const base = 750; // ms
  const max = 5000;
  return Math.min(max, base * Math.pow(2, Math.max(0, attempts - 1)));
}

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    loadQueue();
    for (const item of inMemoryQueue) {
      if (item.status === 'synced') continue;
      if (isSimulatedOffline()) break;
      await syncItem(item);
    }
  } finally {
    isProcessing = false;
  }
}

async function syncItem(item: QueuedEdit) {
  updateItem(item.id, { status: 'syncing' });
  try {
    const token = await getSessionToken();
    const res = await fetch(item.url, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: item.method === 'DELETE' ? undefined : JSON.stringify(item.body),
    });

    const ok = res.ok;
    if (!ok) {
      const err = await safeJson(res);
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    // Success
    updateItem(item.id, { status: 'synced' });
  } catch (e) {
    const attempts = item.attempts + 1;
    updateItem(item.id, { status: 'error', attempts, lastError: e instanceof Error ? e.message : 'Unknown error' });
    const delay = backoffDelay(attempts);
    await sleep(delay);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

// Kick processor periodically
if (typeof window !== 'undefined') {
  loadQueue();
  setInterval(() => {
    if (!isProcessing && !isSimulatedOffline()) {
      processQueue();
    }
  }, 2000);
}


