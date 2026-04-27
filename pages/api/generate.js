import { createClient } from '@supabase/supabase-js';
function sendJson(res, status, payload) { return res.status(status).json(payload); }
function parseRequestBody(body) { if (!body) return {}; if (typeof body === 'string') return JSON.parse(body); return body; }
function trimText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeTags(tags) { if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean); if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean); return []; }
function getSupabase() { const supabaseUrl = (process.env.SUPABASE_URL || '').trim(); const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません'); return createClient(supabaseUrl, supabaseKey); }function getTodayFormatted() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
async function findCustomerIdByName({ supabase, userId, customerId, name }) {
  const trimmedCustomerId = trimText(customerId);
  if (trimmedCustomerId) { const { data, error } = await supabase.from('customers').select('id').eq('user_id', userId).eq('id', trimmedCustomerId).maybeSingle(); if (error) throw new Error(`顧客取得エラー: ${error.message}`); if (data?.id) return data.id; }
  const trimmedName = trimText(name); if (!trimmedName) return null;
  const { data, error } = await supabase.from('customers').select('id').eq('user_id', userId).eq('name', trimmedName).order('updated_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(1);
  if (error) throw new Error(`顧客取得エラー: ${error.message}`);
  return data?.[0]?.id || null;
}
async function createDraftEntry({ supabase, userId, customerId, visitStatus, episodeText, factTags, moodTags, aiText, mode }) {
  if (mode === 'photo' || !customerId) return null;
  const { data, error } = await supabase.from('customer_entries').insert({ user_id: userId, customer_id: customerId, entry_type: visitStatus === 'visit' ? 'visit' : 'sales', entry_date: getTodayFormatted(), input_memo: episodeText, input_tags: [...factTags, ...moodTags], photo_url: null, ai_generated_text: aiText, final_sent_text: null, delivery_status: 'draft' }).select('id').single();
  if (error) { console.error('Customer entries insert error:', error); return null; }
  return data?.id || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const data = parseRequestBody(req.body);
    const userId = data?.userId || 'test-user';
    const difyApiUrl = (process.env.DIFY_API_URL || '').trim();
    const difyApiKey = (process.env.DIFY_API_KEY || '').trim();
    if (!difyApiUrl || !difyApiKey) throw new Error('Difyの環境変数が読み込めていません');
    const supabase = getSupabase();
    const mode = data?.mode === 'photo' ? 'photo' : 'text';
    const visitStatus = data?.visitStatus === 'visit' ? 'visit' : 'sales';
    const episodeText = typeof data?.episodeText === 'string' ? data.episodeText : (typeof data?.episode === 'string' ? data.episode : '');
    const factTags = normalizeTags(data?.factTags || data?.episodeTags);
    const moodTags = normalizeTags(data?.moodTags);
    const customerTags = normalizeTags(data?.customerTags);
    const favoriteTexts = Array.isArray(data?.favoriteTexts) ? data.favoriteTexts.map(text => typeof text === 'string' ? text.trim() : '').filter(Boolean).slice(0, 5) : [];
    const customerId = await findCustomerIdByName({ supabase, userId, customerId: data?.customerId, name: data?.name });
    const difyInputs = { name: data?.name || '', style: data?.style || 'cute', tension: data?.tension || '3', emoji: data?.emoji || '4', custom_text: trimText(data?.customText), business_type: data?.businessType || 'cabaret', visit_status: visitStatus, message_mode: mode, is_photo_diary: mode === 'photo' ? 'yes' : 'no', episode_text: episodeText, fact_tags: factTags.join(', '), mood_tags: moodTags.join(', '), has_episode_text: episodeText.trim() ? 'yes' : 'no', has_fact_tags: factTags.length > 0 ? 'yes' : 'no', customer_rank: data?.customerRank || '新規', customer_tags: customerTags.join(', '), past_memo: data?.pastMemo || '', grounding_priority: 'episodeText > factTags > moodTags > pastMemo', past_memo_usage_rule: 'Use pastMemo as tone/context only. Do not treat it as evidence of today.', photo_caption_hint: '', photo_tags: '', style_reference_texts: favoriteTexts.join('\n\n---\n\n') };
    const difyRes = await fetch(difyApiUrl, { method: 'POST', headers: { Authorization: `Bearer ${difyApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: difyInputs, response_mode: 'blocking', user: userId }) });
    if (!difyRes.ok) throw new Error(`Dify生成エラー: ${difyRes.status} ${await difyRes.text().catch(() => '')}`);
    const difyData = await difyRes.json();
    const aiText = difyData?.data?.outputs?.text || difyData?.data?.outputs?.answer || difyData?.answer || '生成されましたがテキストが空です。';
    const entryId = await createDraftEntry({ supabase, userId, customerId, visitStatus, episodeText, factTags, moodTags, aiText, mode });
    return sendJson(res, 200, { success: true, generatedText: aiText, entry_id: entryId, learned_style_count: favoriteTexts.length });
  } catch (err) { console.error('バックエンド処理エラー:', err); return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' }); }
}
handler.__nextApiHandler = true;

