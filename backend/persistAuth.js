import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const TABLE = "whatsapp_auth";
const REST_URL = URL ? `${URL.replace(/\/+$/, "")}/rest/v1/${TABLE}` : "";

const baseHeaders = () => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
});

const persistConfigured = !!(REST_URL && KEY);

export const persistEnabled = persistConfigured;

async function requestJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...baseHeaders(), ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

export async function restoreAuthDir(dir) {
  if (!persistConfigured) return;
  try {
    await mkdir(dir, { recursive: true });
    const data = await requestJson(`${REST_URL}?select=filename,data`);
    for (const row of data || []) {
      try { await writeFile(path.join(dir, row.filename), Buffer.from(row.data, "base64")); } catch {}
    }
    console.log(`[persistAuth] restored ${data?.length || 0} session files from Supabase`);
  } catch (e) {
    console.warn("[persistAuth] restore error:", e.message);
  }
}

let syncQueued = false;
export function queueSync(dir) {
  if (!persistConfigured) return;
  if (syncQueued) return;
  syncQueued = true;
  setTimeout(async () => {
    syncQueued = false;
    try {
      const files = await readdir(dir).catch(() => []);
      if (!files.length) return;
      const rows = [];
      for (const f of files) {
        try {
          const buf = await readFile(path.join(dir, f));
          rows.push({ filename: f, data: buf.toString("base64"), updated_at: new Date().toISOString() });
        } catch {}
      }
      if (!rows.length) return;
      await requestJson(`${REST_URL}?on_conflict=filename`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
      });
    } catch (e) {
      console.warn("[persistAuth] sync error:", e.message);
    }
  }, 800);
}

export async function clearPersisted() {
  if (!persistConfigured) return;
  try {
    await requestJson(`${REST_URL}?filename=not.is.null`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  } catch {}
}