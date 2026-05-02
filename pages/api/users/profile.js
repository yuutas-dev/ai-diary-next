import { createClient } from '@supabase/supabase-js';
import { requireResolvedUserId } from '../../../lib/validateUserId.js';

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });

  try {
    const userId = requireResolvedUserId(req.query?.userId, res);
    if (!userId) return;

    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase環境変数が未設定です');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('ai_custom_prompt, base_style_text')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`プロフィール取得エラー: ${error.message}`);
    }

    return sendJson(res, 200, {
      success: true,
      profile: {
        ai_custom_prompt: data?.ai_custom_prompt || '',
        base_style_text: data?.base_style_text || '',
      },
    });
  } catch (err) {
    console.error('user profile API error:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
}
