/**
 * Facebook Graph API 串接模組
 * 負責與 Meta Graph API 溝通，抓取粉專貼文數據
 */
const axios = require('axios');

class FacebookAPI {
  constructor(config) {
    this.pageId = config.pageId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      params: { access_token: this.accessToken },
    });

    // 用於速率限制
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * 帶速率限制的 API 請求
   */
  async request(url, params = {}) {
    // 每個請求之間至少間隔 500ms，避免觸發速率限制
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < 500) {
      await this.sleep(500 - elapsed);
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();

    try {
      const response = await this.client.get(url, { params });
      return response.data;
    } catch (error) {
      if (error.response) {
        const fbError = error.response.data?.error;
        if (fbError) {
          // 速率限制處理
          if (fbError.code === 4 || fbError.code === 32) {
            console.log('⏳ API 速率限制，等待 60 秒後重試...');
            await this.sleep(60000);
            return this.request(url, params);
          }
          throw new Error(
            `Facebook API 錯誤 [${fbError.code}]: ${fbError.message}\n` +
            `類型: ${fbError.type}\n` +
            (fbError.error_subcode ? `子代碼: ${fbError.error_subcode}` : '')
          );
        }
      }
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 取得粉專基本資訊（名稱、追蹤人數）
   */
  async getPageInfo() {
    console.log('📄 正在取得粉專資訊...');
    const data = await this.request(`/${this.pageId}`, {
      fields: 'name,followers_count,fan_count,about,category',
    });

    return {
      name: data.name,
      followersCount: data.followers_count || data.fan_count || 0,
      about: data.about || '',
      category: data.category || '',
    };
  }

  /**
   * 取得指定月份的所有貼文
   * @param {number} year - 年份
   * @param {number} month - 月份 (1-12)
   */
  async getMonthlyPosts(year, month) {
    // 計算月份的起始與結束 Unix 時間戳
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59); // 該月最後一天
    const since = Math.floor(startDate.getTime() / 1000);
    const until = Math.floor(endDate.getTime() / 1000);

    console.log(`📅 抓取期間：${startDate.toLocaleDateString('zh-TW')} ～ ${endDate.toLocaleDateString('zh-TW')}`);

    const fields = [
      'message',
      'created_time',
      'permalink_url',
      'full_picture',
      'attachments{media_type,type,title,description,subattachments}',
      'reactions.summary(true)',
      'comments.limit(50).summary(true){message,created_time}',
      'shares',
    ].join(',');

    let allPosts = [];
    let url = `/${this.pageId}/posts`;
    let params = { fields, since, until, limit: 100 };
    let page = 1;

    while (url) {
      console.log(`  📥 取得第 ${page} 頁貼文...`);

      let data;
      if (page === 1) {
        data = await this.request(url, params);
      } else {
        // 後續頁面使用完整的 paging URL
        const response = await axios.get(url, { timeout: 30000 });
        data = response.data;
      }

      if (data.data && data.data.length > 0) {
        allPosts = allPosts.concat(data.data);
        console.log(`  ✅ 已取得 ${allPosts.length} 篇貼文`);
      }

      // 處理分頁
      if (data.paging && data.paging.next) {
        url = data.paging.next;
        page++;
      } else {
        url = null;
      }
    }

    console.log(`📊 本月共找到 ${allPosts.length} 篇貼文`);
    return allPosts;
  }

  /**
   * 取得單篇貼文的洞察數據（觸及人數）
   * @param {string} postId - 貼文 ID
   */
  async getPostInsights(postId) {
    try {
      const data = await this.request(`/${postId}/insights`, {
        metric: 'post_impressions_unique',
      });

      if (data.data && data.data.length > 0) {
        const metric = data.data.find(m => m.name === 'post_impressions_unique');
        if (metric && metric.values && metric.values.length > 0) {
          return metric.values[0].value;
        }
      }
      return 0;
    } catch (error) {
      // 部分貼文可能無法取得 insights（如分享貼文）
      console.log(`  ⚠️ 無法取得貼文 ${postId} 的觸及數據: ${error.message}`);
      return 0;
    }
  }

  /**
   * 完整抓取流程：粉專資訊 + 所有貼文 + 各貼文觸及數據
   */
  async fetchAllData(year, month) {
    console.log('\n🚀 開始抓取 Facebook 粉專數據...\n');
    console.log('='.repeat(50));

    // 1. 取得粉專資訊
    const pageInfo = await this.getPageInfo();
    console.log(`  粉專名稱: ${pageInfo.name}`);
    console.log(`  追蹤人數: ${pageInfo.followersCount.toLocaleString()}`);
    console.log('');

    // 2. 取得月份貼文
    const rawPosts = await this.getMonthlyPosts(year, month);

    if (rawPosts.length === 0) {
      console.log('\n⚠️ 該月份沒有找到任何貼文！');
      return { pageInfo, posts: [], year, month };
    }

    // 3. 逐篇取得觸及數據
    console.log('\n📈 正在取得各貼文觸及數據...');
    const posts = [];

    for (let i = 0; i < rawPosts.length; i++) {
      const post = rawPosts[i];
      const progress = `[${i + 1}/${rawPosts.length}]`;
      process.stdout.write(`  ${progress} 處理中...`);

      // 取得觸及數據
      const reach = await this.getPostInsights(post.id);

      // 解析貼文數據
      const parsedPost = this.parsePost(post, reach);
      posts.push(parsedPost);

      // 清除進度行並顯示結果
      if (process.stdout.isTTY && process.stdout.clearLine) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      } else {
        process.stdout.write('\n');
      }
      console.log(`  ${progress} ✅ ${parsedPost.title.substring(0, 30)}... | 觸及: ${reach.toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 數據抓取完成！共 ${posts.length} 篇貼文`);
    console.log(`   API 總請求數: ${this.requestCount}`);

    return { pageInfo, posts, year, month };
  }

  /**
   * 解析原始貼文數據為結構化格式
   */
  parsePost(rawPost, reach) {
    // 解析互動數據
    const reactions = rawPost.reactions?.summary?.total_count || 0;
    const comments = rawPost.comments?.summary?.total_count || 0;
    const shares = rawPost.shares?.count || 0;
    const totalEngagement = reactions + comments + shares;

    // 解析素材型式
    const mediaType = this.parseMediaType(rawPost);

    // 解析標題（從貼文內容提取）
    const message = rawPost.message || '（無文字內容）';
    const title = this.extractTitle(message);

    // 計算互動率
    const engagementRate = reach > 0 ? totalEngagement / reach : 0;

    // 解析留言詳細內容
    const commentsList = (rawPost.comments?.data || []).map(c => ({
      message: c.message,
      createdTime: c.created_time
    }));

    return {
      id: rawPost.id,
      title,
      message,
      mediaType,
      reach,
      reactions,
      comments,
      commentsList,
      shares,
      totalEngagement,
      engagementRate,
      createdTime: rawPost.created_time,
      permalink: rawPost.permalink_url || '',
      picture: rawPost.full_picture || '',
    };
  }

  /**
   * 從附件判斷素材型式
   */
  parseMediaType(post) {
    if (!post.attachments?.data?.length) {
      return '文字';
    }

    const attachment = post.attachments.data[0];
    const mediaType = attachment.media_type || '';
    const type = attachment.type || '';

    // 判斷子附件數量（多圖判定為相簿）
    const subCount = attachment.subattachments?.data?.length || 0;

    if (mediaType === 'video' || type === 'video_inline') return '影片';
    if (type === 'album' || subCount > 1) return '相簿';
    if (mediaType === 'photo' || type === 'photo') return '照片';
    if (mediaType === 'link' || type === 'share') return '連結';
    if (type === 'cover_photo') return '照片';

    return '其他';
  }

  /**
   * 從貼文內容提取標題
   * 優先使用 hashtag，其次使用第一行文字
   */
  extractTitle(message) {
    if (!message) return '（無標題）';

    // 嘗試提取 hashtag 作為分類
    const hashtags = message.match(/#[\u4e00-\u9fffA-Za-z0-9_]+/g);
    if (hashtags && hashtags.length > 0) {
      return hashtags.slice(0, 3).join(' ');
    }

    // 使用第一行文字（去除 emoji 和特殊符號後）
    const firstLine = message.split('\n').find(line => line.trim().length > 0) || message;
    const cleaned = firstLine.trim();

    if (cleaned.length > 40) {
      return cleaned.substring(0, 40) + '...';
    }

    return cleaned || '（無標題）';
  }
}

module.exports = FacebookAPI;
