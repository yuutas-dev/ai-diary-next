import { createClient } from '@supabase/supabase-js';
function sendJson(res, status, payload) { return res.status(status).json(payload); }
function parseRequestBody(body) { if (!body) return {}; if (typeof body === 'string') return JSON.parse(body); return body; }
function trimText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeTags(tags) { if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean); if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean); return []; }
function getSupabase() { const supabaseUrl = (process.env.SUPABASE_URL || '').trim(); const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません'); return createClient(supabaseUrl, supabaseKey); }
function normalizeDate(input) { const normalized = String(input || '').replace(/\//g, '-').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized; const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const data = parseRequestBody(req.body);
    const userId = data?.userId || 'test-user';
    const customerId = data?.customerId || null;
    const episodeText = typeof data?.episodeText === 'string' ? data.episodeText.trim() : '';
    const factTags = normalizeTags(data?.factTags);
    if (!customerId) return sendJson(res, 400, { success: false, error: 'customerId is required' });
    if (episodeText.length < 12 && factTags.length < 1) return sendJson(res, 400, { success: false, error: '内容が不足しているため保存できません' });
    const { data: inserted, error } = await getSupabase().from('customer_entries').insert({ user_id: userId, customer_id: customerId, entry_type: 'visit', entry_date: normalizeDate(data?.entryDate), input_memo: episodeText, input_tags: factTags, photo_url: null, ai_generated_text: null, final_sent_text: null, delivery_status: 'manual' }).select('id').single();
    if (error) throw new Error('エピソード保存エラー: ' + error.message);
    return sendJson(res, 200, { success: true, entryId: inserted?.id || null });
  } catch (err) { console.error('entries/save-episode error:', err); return sendJson(res, 500, { success: false, error: err.message }); }
}
handler.__nextApiHandler = true;

