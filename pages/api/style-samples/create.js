import { createClient } from '@supabase/supabase-js';
function sendJson(res, status, payload) { return res.status(status).json(payload); }
function parseRequestBody(body) { if (!body) return {}; if (typeof body === 'string') return JSON.parse(body); return body; }
function trimText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeTags(tags) { if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean); if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean); return []; }
function getSupabase() { const supabaseUrl = (process.env.SUPABASE_URL || '').trim(); const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません'); return createClient(supabaseUrl, supabaseKey); }function normalizeSourceType(sourceType) { return sourceType === 'generated' ? 'generated' : 'manual'; }

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const body = parseRequestBody(req.body);
    const userId = trimText(body.userId) || 'test-user';
    const text = trimText(body.text);
    const sourceType = normalizeSourceType(body.sourceType);
    const sourceEntryId = trimText(body.sourceEntryId) || null;
    if (!text) return sendJson(res, 400, { success: false, error: 'text is required' });
    const { data: sample, error } = await getSupabase().from('writing_style_samples').insert({ user_id: userId, text, source_type: sourceType, source_entry_id: sourceEntryId, is_active: true }).select('id, text, source_type, created_at').single();
    if (error) throw error;
    return sendJson(res, 200, { success: true, sample: { id: sample.id, text: sample.text, source_type: sample.source_type || sourceType, created_at: sample.created_at || null }, table: 'writing_style_samples' });
  } catch (err) { console.error('Style sample create error:', err); return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' }); }
}
handler.__nextApiHandler = true;

