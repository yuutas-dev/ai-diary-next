import { createClient } from '@supabase/supabase-js';
import { requireResolvedUserId } from '../../../lib/validateUserId.js';

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

function parseRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });

  try {
    const data = parseRequestBody(req.body);
    const userId = requireResolvedUserId(data?.userId, res);
    if (!userId) return;

    const pastLineText = (data?.pastLineText || '').trim();
    if (!pastLineText) {
      return sendJson(res, 400, { success: false, error: '過去のLINE文章が入力されていません' });
    }

    const difyAnalyzeKey = (process.env.DIFY_ANALYZE_API_KEY || '').trim();
    if (!difyAnalyzeKey) {
      throw new Error('分析用DifyのAPIキーが設定されていません');
    }

    const difyBase = (process.env.DIFY_API_URL || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1').replace(/\/$/, '');

    // 1. Difyに分析をリクエスト
    // ※もしDify側で「ワークフロー」ではなく「テキストジェネレーター」で作った場合は、
    // ここを `${difyBase}/completion-messages` に変更し、body内の response_mode を除外する必要があります。
    const difyRes = await fetch(`${difyBase}/workflows/run`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${difyAnalyzeKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        inputs: { past_line_text: pastLineText }, 
        response_mode: 'blocking', 
        user: userId 
      }),
    });

    if (!difyRes.ok) {
      const errText = await difyRes.text().catch(() => '');
      throw new Error(`Dify分析エラー: ${difyRes.status} ${errText}`);
    }

    const difyData = await difyRes.json();
    
    // Difyの出力から生成されたプロンプトを抽出
    const analyzedPrompt = 
      difyData?.data?.outputs?.text || 
      difyData?.data?.outputs?.answer || 
      difyData?.answer || 
      '';

    if (!analyzedPrompt.trim()) {
      throw new Error('ルールの抽出に失敗しました（AIの回答が空です）');
    }

    // 2. Supabase の user_profiles に保存
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ai_custom_prompt: analyzedPrompt.trim(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (dbError) {
      throw new Error(`DB保存エラー: ${dbError.message}`);
    }

    return sendJson(res, 200, { success: true, customPrompt: analyzedPrompt.trim() });

  } catch (err) {
    console.error('分析APIエラー:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
}
