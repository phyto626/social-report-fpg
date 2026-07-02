/**
 * 留言分析模組 — 串接 Gemini AI 進行留言分類分析
 *
 * 功能：
 *  1. 從貼文中收集所有留言
 *  2. 篩選過濾無效留言（純 emoji、字數不足、品牌自己的回覆）
 *  3. 呼叫 Gemini API 進行分類、歸納代表留言、產出建議方向
 */
const axios = require('axios');

// ───── 預設白名單：品牌帳號名稱（小寫比對） ─────
const DEFAULT_BRAND_USERNAMES = [
  '台塑便利家',
  'ecoco',
  'ecoco 循環經濟',
  'ecoco循環經濟',
  'fpg',
];

// ───── 篩選工具 ─────

/**
 * 判斷字串是否為「純 emoji / 符號」，不含任何可辨識文字
 */
function isPureEmoji(text) {
  // 去除所有 emoji、符號、空白後看剩不剩東西
  const stripped = text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/[\u200d\ufe0f\u20e3]/g, '')   // ZWJ、variation selectors
    .replace(/[^\p{L}\p{N}]/gu, '')          // 去掉非字母/數字
    .trim();
  return stripped.length === 0;
}

/**
 * 篩選留言：去掉無效留言
 * @param {Array<{message: string, from?: string}>} comments
 * @param {string[]} brandUsernames — 品牌帳號名稱白名單
 * @returns {string[]} 有效留言陣列
 */
function filterComments(comments, brandUsernames = []) {
  const lowerBrand = [...DEFAULT_BRAND_USERNAMES, ...brandUsernames].map(n => n.toLowerCase());

  return comments
    .filter(c => {
      const msg = (c.message || '').trim();
      // 1. 沒有內容
      if (!msg) return false;
      // 2. 純 emoji
      if (isPureEmoji(msg)) return false;
      // 3. 字數 < 3
      if ([...msg].length < 3) return false;
      // 4. 品牌自己的回覆
      if (c.from) {
        const fromName = (typeof c.from === 'object' ? c.from.name || '' : String(c.from)).toLowerCase();
        if (lowerBrand.some(b => fromName.includes(b))) return false;
      }
      return true;
    })
    .map(c => c.message.trim());
}

// ───── Gemini API 呼叫 ─────

/**
 * 呼叫 Gemini 分析留言
 * @param {string[]} validComments — 已篩選後的有效留言
 * @param {string} brandName — 品牌名稱
 * @param {string} geminiApiKey — API key
 * @returns {Promise<object>} AI 結構化分析結果
 */
async function callGeminiAnalysis(validComments, brandName, geminiApiKey) {
  const MODEL = 'gemini-3.1-flash-lite-preview';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`;

  // 準備留言文字（最多取前 200 則避免 token 過長）
  const sampleComments = validComments.slice(0, 200);
  const commentBlock = sampleComments.map((c, i) => `${i + 1}. ${c}`).join('\n');

  const prompt = `你是一位社群行銷分析專家。以下是「${brandName}」Facebook 粉絲專頁上，本月由粉絲留下的有效留言共 ${sampleComments.length} 則（已去除純 emoji、字數過短與品牌自身回覆）。

請將這些留言歸納為 3～5 個類別，每個類別請提供：
1. category：類別名稱（簡短，例如「機台故障與滿桶反映」「產品使用疑問」「正面口碑與推薦」等）
2. emoji：一個代表性 emoji
3. percentage：該類別佔全部有效留言的百分比（整數，所有類別加總應為 100%）
4. representativeComments：1～2 則最具代表性的原文留言
5. suggestion：針對此類別留言，建議未來一則貼文主題方向（具體可執行的社群內容建議）

請嚴格以下列 JSON 格式回應，不要加任何多餘文字或 markdown 符號：
{
  "categories": [
    {
      "category": "類別名稱",
      "emoji": "📍",
      "percentage": 29,
      "representativeComments": ["原文留言1", "原文留言2"],
      "suggestion": "建議的貼文方向…"
    }
  ],
  "summary": "一段總結性的觀察（2~3句）"
}

以下為留言：
${commentBlock}`;

  try {
    const response = await axios.post(endpoint, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 嘗試解析 JSON（可能包裹在 ```json ... ``` 中）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Gemini] 無法從回應中提取 JSON：', raw.substring(0, 300));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (err) {
    console.error('[Gemini] API 呼叫失敗：', err.message);
    if (err.response?.data) {
      console.error('[Gemini] 回應內容：', JSON.stringify(err.response.data).substring(0, 500));
    }
    return null;
  }
}

// ───── 主流程 ─────

/**
 * 分析貼文留言並產出結構化洞察
 * @param {Array} posts — 解析後的貼文陣列（含 commentsList）
 * @param {string} brandName — 品牌名稱
 * @param {object} options
 * @param {string} options.geminiApiKey — Gemini API Key
 * @param {string[]} [options.brandUsernames] — 額外的品牌帳號名稱白名單
 * @returns {Promise<object|null>} 結構化洞察結果，或 null（留言不足/API 失敗）
 */
async function analyzeComments(posts, brandName, options = {}) {
  const { geminiApiKey, brandUsernames = [] } = options;

  if (!geminiApiKey) {
    console.log('[CommentAnalyzer] 未設定 GEMINI_API_KEY，跳過 AI 留言分析。');
    return null;
  }

  // 1. 收集所有留言
  const allComments = [];
  for (const post of posts) {
    if (post.commentsList && Array.isArray(post.commentsList)) {
      for (const c of post.commentsList) {
        allComments.push({
          message: c.message || '',
          from: c.from || null,
        });
      }
    }
  }

  console.log(`[CommentAnalyzer] 原始留言共 ${allComments.length} 則`);

  // 2. 篩選
  const validComments = filterComments(allComments, brandUsernames);
  console.log(`[CommentAnalyzer] 篩選後有效留言共 ${validComments.length} 則`);

  if (validComments.length < 3) {
    console.log('[CommentAnalyzer] 有效留言不足 3 則，跳過 AI 分析。');
    return {
      source: 'insufficient',
      totalRaw: allComments.length,
      totalValid: validComments.length,
      categories: [],
      summary: '本月有效留言數量不足，無法進行分類分析。',
    };
  }

  // 3. 呼叫 Gemini
  console.log(`[CommentAnalyzer] 正在呼叫 Gemini AI 分析 ${validComments.length} 則留言...`);
  const result = await callGeminiAnalysis(validComments, brandName, geminiApiKey);

  if (!result) {
    return {
      source: 'error',
      totalRaw: allComments.length,
      totalValid: validComments.length,
      categories: [],
      summary: 'AI 分析呼叫失敗，請確認 GEMINI_API_KEY 是否正確。',
    };
  }

  return {
    source: 'gemini',
    totalRaw: allComments.length,
    totalValid: validComments.length,
    ...result,
  };
}

module.exports = {
  analyzeComments,
  filterComments,
  isPureEmoji,
};
