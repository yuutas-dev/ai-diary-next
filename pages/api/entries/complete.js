import { createClient } from '@supabase/supabase-js';
function sendJson(res, status, payload) { return res.status(status).json(payload); }
function parseRequestBody(body) { if (!body) return {}; if (typeof body === 'string') return JSON.parse(body); return body; }
function trimText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeTags(tags) { if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean); if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean); return []; }
function getSupabase() { const supabaseUrl = (process.env.SUPABASE_URL || '').trim(); const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません'); return createClient(supabaseUrl, supabaseKey); }
function getStatusPriority(status) { return { draft: 0, copied: 1, line_sent: 2, legacy: 0, manual: 0 }[status] ?? 0; }
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const data = parseRequestBody(req.body);
    const userId = trimText(data?.userId) || 'test-user';
    const entryId = trimText(data?.entryId);
    const finalSentText = typeof data?.finalSentText === 'string' ? data.finalSentText : '';
    const requestedStatus = trimText(data?.deliveryStatus) || 'copied';
    if (!entryId) return sendJson(res, 400, { success: false, error: 'entryId is required' });
    const supabase = getSupabase();
    const { data: existingEntry, error: fetchError } = await supabase.from('customer_entries').select('delivery_status').eq('id', entryId).eq('user_id', userId).single();
    if (fetchError || !existingEntry) throw new Error('対象のエントリが見つからないか、アクセス権限がありません');
    const statusToSave = getStatusPriority(requestedStatus) >= getStatusPriority(existingEntry.delivery_status) ? requestedStatus : existingEntry.delivery_status;
    const { error } = await supabase.from('customer_entries').update({ final_sent_text: finalSentText, delivery_status: statusToSave, updated_at: new Date().toISOString() }).eq('id', entryId).eq('user_id', userId);
    if (error) throw new Error('エントリの更新に失敗しました: ' + error.message);
    return sendJson(res, 200, { success: true, delivery_status: statusToSave });
  } catch (err) { console.error('API Complete Error:', err); return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' }); }
}
handler.__nextApiHandler = true;

