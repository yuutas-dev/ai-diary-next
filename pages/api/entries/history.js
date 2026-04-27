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
    const userId = data?.userId || 'test-user';
    const customerId = data?.customerId || null;
    const supabase = getSupabase();
    let entriesQuery = supabase.from('customer_entries').select('id, customer_id, entry_type, entry_date, delivery_status, ai_generated_text, final_sent_text, created_at').eq('user_id', userId).in('delivery_status', ['draft', 'copied', 'line_sent']).order('entry_date', { ascending: false }).order('created_at', { ascending: false });
    if (customerId) entriesQuery = entriesQuery.eq('customer_id', customerId);
    const { data: entries, error: entriesError } = await entriesQuery;
    if (entriesError) throw new Error('履歴取得エラー: ' + entriesError.message);
    const filteredEntries = (entries || []).filter(entry => Boolean((entry.ai_generated_text || '').trim() || (entry.final_sent_text || '').trim()));
    const customerIds = [...new Set(filteredEntries.map(e => e.customer_id).filter(Boolean))];
    let customerNameMap = new Map();
    if (customerIds.length > 0) {
      const { data: customers, error: customersError } = await supabase.from('customers').select('id, name').in('id', customerIds);
      if (customersError) throw new Error('顧客名取得エラー: ' + customersError.message);
      customerNameMap = new Map((customers || []).map(c => [c.id, c.name]));
    }
    const items = filteredEntries.map(entry => ({ entryId: entry.id, customerId: entry.customer_id, customerName: customerNameMap.get(entry.customer_id) || '不明な顧客', entryType: entry.entry_type, entryDate: entry.entry_date, deliveryStatus: entry.delivery_status, aiGeneratedText: entry.ai_generated_text || '', finalSentText: entry.final_sent_text || '', isFavorited: false }));
    return sendJson(res, 200, { success: true, items });
  } catch (err) { console.error('entries/history error:', err); return sendJson(res, 500, { success: false, error: err.message }); }
}
handler.__nextApiHandler = true;

