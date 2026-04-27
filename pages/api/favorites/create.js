import { createClient } from '@supabase/supabase-js';
function sendJson(res, status, payload) { return res.status(status).json(payload); }
function parseRequestBody(body) { if (!body) return {}; if (typeof body === 'string') return JSON.parse(body); return body; }
function trimText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeTags(tags) { if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean); if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean); return []; }
function getSupabase() { const supabaseUrl = (process.env.SUPABASE_URL || '').trim(); const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません'); return createClient(supabaseUrl, supabaseKey); }function sanitizeId(value) { if (value === null || value === undefined) return null; const normalized = String(value).trim(); return normalized ? normalized : null; }
function safeApiError(message = 'お気に入り登録に失敗しました') { return { success: false, error: message }; }
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const data = parseRequestBody(req.body);
    const userId = data?.userId || 'test-user';
    const entryId = sanitizeId(data?.entryId);
    const customerId = sanitizeId(data?.customerId);
    const customerName = (data?.customerName || '').trim() || null;
    if (!entryId) return sendJson(res, 400, safeApiError());
    const supabase = getSupabase();
    const { data: entry, error: entryError } = await supabase.from('customer_entries').select('id, user_id, customer_id, ai_generated_text, final_sent_text').eq('id', String(entryId)).eq('user_id', userId).maybeSingle();
    if (entryError) throw new Error('履歴の確認に失敗しました');
    if (!entry?.id) return sendJson(res, 404, safeApiError());
    const sampleText = (entry.final_sent_text || entry.ai_generated_text || '').trim();
    if (!sampleText) return sendJson(res, 400, safeApiError());
    const { error } = await supabase.from('favorite_writing_samples').upsert({ user_id: userId, source_entry_id: String(entry.id), source_customer_id: sanitizeId(entry.customer_id) || customerId, source_customer_name: customerName, sample_text: sampleText, updated_at: new Date().toISOString() }, { onConflict: 'user_id,source_entry_id' });
    if (error) throw new Error('お気に入り登録に失敗しました');
    return sendJson(res, 200, { success: true, entryId: entry.id });
  } catch (err) { console.error('favorites/create error:', err); return sendJson(res, 500, safeApiError()); }
}
handler.__nextApiHandler = true;

