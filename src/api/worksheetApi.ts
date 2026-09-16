/**
 * Shared worksheet API client.
 *
 * Talks to the SciTech API server (server/index.js) so teacher and students
 * on the LAN share ONE database. If the server is unreachable (e.g. running
 * the dev build standalone), falls back to localStorage automatically.
 */

const API_BASE = '/api';
const LS_WORKSHEETS = 'scitech_worksheets';
const LS_SUBMISSIONS = 'scitech_worksheet_submissions';

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // server unreachable → caller falls back to localStorage
  }
}

// ---------- localStorage fallback helpers ----------
function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full — ignore */ }
}

// ---------- Worksheets ----------
export const worksheetApi = {
  async list(): Promise<{ data: import('../types').Worksheet[]; fromServer: boolean }> {
    const data = await api<import('../types').Worksheet[]>('/worksheets');
    if (data) return { data, fromServer: true };
    return { data: lsRead<import('../types').Worksheet[]>(LS_WORKSHEETS, []), fromServer: false };
  },

  /** POST แบบไม่มี fallback — ใช้โดย polling เพื่อ "ลองส่งซ้ำ" ใบงานที่ค้างในเครื่อง
   *  ตอนเซิร์ฟเวอร์ล่ม (คืน null เมื่อเซิร์ฟเวอร์ยังไม่ตอบ) */
  async push(worksheet: Omit<import('../types').Worksheet, 'id'>): Promise<import('../types').Worksheet | null> {
    return api<import('../types').Worksheet>('/worksheets', {
      method: 'POST',
      body: JSON.stringify(worksheet),
    });
  },

  async add(worksheet: Omit<import('../types').Worksheet, 'id'>): Promise<import('../types').Worksheet> {
    const created = await api<import('../types').Worksheet>('/worksheets', {
      method: 'POST',
      body: JSON.stringify(worksheet),
    });
    if (created) return created;
    // Fallback: mimic the old localStorage behaviour
    const list = lsRead<import('../types').Worksheet[]>(LS_WORKSHEETS, []);
    const nextId = list.reduce((m, w) => Math.max(m, w.id), 0) + 1;
    const local = { ...worksheet, id: nextId };
    lsWrite(LS_WORKSHEETS, [local, ...list]);
    return local;
  },

  async update(id: number, updates: Partial<import('../types').Worksheet>): Promise<boolean> {
    const ok = await api(`/worksheets/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (ok !== null) return true;
    const list = lsRead<import('../types').Worksheet[]>(LS_WORKSHEETS, []);
    lsWrite(LS_WORKSHEETS, list.map(w => (w.id === id ? { ...w, ...updates, id } : w)));
    return false;
  },

  async remove(id: number): Promise<boolean> {
    const ok = await api(`/worksheets/${id}`, { method: 'DELETE' });
    if (ok !== null) return true;
    const list = lsRead<import('../types').Worksheet[]>(LS_WORKSHEETS, []);
    lsWrite(LS_WORKSHEETS, list.filter(w => w.id !== id));
    return false;
  },
};

// ---------- Submissions ----------
export const submissionApi = {
  async list(): Promise<{ data: import('../types').WorksheetSubmission[]; fromServer: boolean }> {
    const data = await api<import('../types').WorksheetSubmission[]>('/submissions');
    if (data) return { data, fromServer: true };
    return { data: lsRead<import('../types').WorksheetSubmission[]>(LS_SUBMISSIONS, []), fromServer: false };
  },

  /** POST แบบไม่มี fallback — polling ใช้ "ลองส่งซ้ำ" คำตอบที่ค้างในเครื่องตอนเซิร์ฟเวอร์ล่ม
   *  (กันคำตอบนักเรียนหาย — เซิร์ฟเวอร์กลับมาเมื่อไรส่งขึ้นทันที) */
  async push(submission: Omit<import('../types').WorksheetSubmission, 'id'>): Promise<import('../types').WorksheetSubmission | null> {
    return api<import('../types').WorksheetSubmission>('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  },

  async add(submission: Omit<import('../types').WorksheetSubmission, 'id'>): Promise<import('../types').WorksheetSubmission> {
    const created = await api<import('../types').WorksheetSubmission>('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
    if (created) return created;
    // Fallback: mimic the old localStorage behaviour — mark _pending so the
    // polling retry-push uploads it the moment the server is reachable again
    const list = lsRead<import('../types').WorksheetSubmission[]>(LS_SUBMISSIONS, []);
    const nextId = list.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0) + 1;
    const local = { ...submission, id: nextId, _pending: true };
    lsWrite(LS_SUBMISSIONS, [local, ...list]);
    return local;
  },

  async update(id: number, updates: Partial<import('../types').WorksheetSubmission>): Promise<boolean> {
    const ok = await api(`/submissions/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (ok !== null) return true;
    const list = lsRead<import('../types').WorksheetSubmission[]>(LS_SUBMISSIONS, []);
    lsWrite(LS_SUBMISSIONS, list.map(s => (s.id === id ? { ...s, ...updates, id } : s)));
    return false;
  },
};
