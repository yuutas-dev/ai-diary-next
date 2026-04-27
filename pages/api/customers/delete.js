import { createClient } from '@supabase/supabase-js';

function sendJson(res, status, payload) { return res.status(status).json(payload); }
function parseRequestBody(body) { if (!body) return {}; if (typeof body === 'string') return JSON.parse(body); return body; }
function trimText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeTags(tags) { if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean); if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean); return []; }
function getSupabase() { const supabaseUrl = (process.env.SUPABASE_URL || '').trim(); const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません'); return createClient(supabaseUrl, supabaseKey); }
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const data = parseRequestBody(req.body);
    const userId = trimText(data?.userId) || 'test-user';
    const customerId = trimText(data?.customerId);
    if (!customerId) return sendJson(res, 400, { success: false, error: 'customerId is required' });
    const { error } = await getSupabase().from('customers').delete().eq('user_id', userId).eq('id', customerId);
    if (error) throw new Error('Supabase削除エラー: ' + error.message);
    return sendJson(res, 200, { success: true });
  } catch (err) { console.error('バックエンド処理エラー:', err); return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' }); }
}
handler.__nextApiHandler = true;

