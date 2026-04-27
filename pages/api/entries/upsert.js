import { createClient } from '@supabase/supabase-js';
function sendJson(res, status, payload) { return res.status(status).json(payload); }
function parseRequestBody(body) { if (!body) return {}; if (typeof body === 'string') return JSON.parse(body); return body; }
function trimText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeTags(tags) { if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean); if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean); return []; }
function getSupabase() { const supabaseUrl = (process.env.SUPABASE_URL || '').trim(); const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません'); return createClient(supabaseUrl, supabaseKey); }
function normalizeDate(input) { if (!input) return null; const normalized = String(input).replace(/\//g, '-').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null; }
function normalizeEntryType(type) { return type === 'sales' ? 'sales' : 'visit'; }
function sanitizeEntries(entries) { return (Array.isArray(entries) ? entries : []).map(entry => ({ id: trimText(entry?.id) || null, date: normalizeDate(entry?.date), text: trimText(entry?.text), tags: normalizeTags(entry?.tags), photoUrl: trimText(entry?.photoUrl) || null, type: normalizeEntryType(entry?.type) })).filter(entry => entry.date && (entry.text || entry.tags.length > 0 || entry.photoUrl)); }
function sanitizeDeletedEntryIds(entryIds) { return Array.from(new Set((Array.isArray(entryIds) ? entryIds : []).map(id => trimText(id)).filter(Boolean))); }
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const data = parseRequestBody(req.body);
    const userId = trimText(data?.userId) || 'test-user';
    const customerId = trimText(data?.customerId);
    const entries = sanitizeEntries(data?.entries);
    const deletedEntryIds = sanitizeDeletedEntryIds(data?.deletedEntryIds);
    if (!customerId) return sendJson(res, 400, { success: false, error: 'customerId is required' });
    const supabase = getSupabase();
    if (deletedEntryIds.length > 0) {
      const { error } = await supabase.from('customer_entries').delete().eq('user_id', userId).eq('customer_id', customerId).in('id', deletedEntryIds);
      if (error) throw new Error('削除対象エントリの削除エラー: ' + error.message);
    }
    for (const entry of entries) {
      const payload = { user_id: userId, customer_id: customerId, entry_type: entry.type, entry_date: entry.date, input_memo: entry.text, input_tags: entry.tags, photo_url: entry.photoUrl, delivery_status: 'manual', updated_at: new Date().toISOString() };
      if (entry.id) {
        const { error } = await supabase.from('customer_entries').update(payload).eq('id', entry.id).eq('user_id', userId).eq('customer_id', customerId);
        if (error) throw new Error('エントリ更新エラー: ' + error.message);
      } else {
        const { error } = await supabase.from('customer_entries').insert(payload);
        if (error) throw new Error('エントリ作成エラー: ' + error.message);
      }
    }
    return sendJson(res, 200, { success: true });
  } catch (err) { console.error('Entries Upsert Error:', err); return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' }); }
}
handler.__nextApiHandler = true;

