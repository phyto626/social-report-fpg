/**
 * 數據分析模組
 * 負責處理、分析社群數據並生成洞察
 */

class DataAnalyzer {
  constructor(data) {
    this.pageInfo = data.pageInfo;
    this.posts = data.posts;
    this.year = data.year;
    this.month = data.month;
  }

  /**
   * 執行完整分析流程
   */
  analyze() {
    const kpi = this.calculateKPIs();
    const topPost = this.findTopPost();
    const topicAnalysis = this.analyzeByTopic();
    const mediaAnalysis = this.analyzeByMediaType();
    const insights = this.generateInsights(topicAnalysis, mediaAnalysis);
    const activityPlan = this.generateActivityPlan(topicAnalysis, mediaAnalysis);

    return {
      pageInfo: this.pageInfo,
      year: this.year,
      month: this.month,
      kpi,
      topPost,
      topicAnalysis,
      mediaAnalysis,
      insights,
      activityPlan,
      posts: this.posts,
    };
  }

  /**
   * 計算 KPI 指標
   */
  calculateKPIs() {
    const totalPosts = this.posts.length;
    const followersCount = this.pageInfo.followersCount;
    const totalReach = this.posts.reduce((sum, p) => sum + p.reach, 0);
    const totalEngagement = this.posts.reduce((sum, p) => sum + p.totalEngagement, 0);
    const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;

    // 整體互動率
    const overallEngagementRate = totalReach > 0 ? totalEngagement / totalReach : 0;

    return {
      totalPosts,
      followersCount,
      totalReach,
      totalEngagement,
      avgEngagement,
      overallEngagementRate,
    };
  }

  /**
   * 找出互動率最高的貼文
   */
  findTopPost() {
    if (this.posts.length === 0) return null;

    return this.posts.reduce((top, post) => {
      return post.engagementRate > (top?.engagementRate || 0) ? post : top;
    }, this.posts[0]);
  }

  /**
   * 依主題分析互動表現
   */
  analyzeByTopic() {
    const topicMap = new Map();

    this.posts.forEach(post => {
      const topic = post.title;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          topic,
          posts: [],
          totalReach: 0,
          totalEngagement: 0,
          count: 0,
        });
      }
      const entry = topicMap.get(topic);
      entry.posts.push(post);
      entry.totalReach += post.reach;
      entry.totalEngagement += post.totalEngagement;
      entry.count++;
    });

    // 計算各主題平均互動率
    const topics = Array.from(topicMap.values()).map(t => ({
      ...t,
      avgReach: Math.round(t.totalReach / t.count),
      avgEngagement: Math.round(t.totalEngagement / t.count),
      engagementRate: t.totalReach > 0 ? t.totalEngagement / t.totalReach : 0,
    }));

    // 依互動率排序
    topics.sort((a, b) => b.engagementRate - a.engagementRate);

    return topics;
  }

  /**
   * 依素材型式分析
   */
  analyzeByMediaType() {
    const mediaMap = new Map();

    this.posts.forEach(post => {
      const type = post.mediaType;
      if (!mediaMap.has(type)) {
        mediaMap.set(type, {
          type,
          posts: [],
          totalReach: 0,
          totalEngagement: 0,
          count: 0,
        });
      }
      const entry = mediaMap.get(type);
      entry.posts.push(post);
      entry.totalReach += post.reach;
      entry.totalEngagement += post.totalEngagement;
      entry.count++;
    });

    const mediaTypes = Array.from(mediaMap.values()).map(m => ({
      ...m,
      avgReach: Math.round(m.totalReach / m.count),
      avgEngagement: Math.round(m.totalEngagement / m.count),
      engagementRate: m.totalReach > 0 ? m.totalEngagement / m.totalReach : 0,
    }));

    mediaTypes.sort((a, b) => b.engagementRate - a.engagementRate);

    return mediaTypes;
  }

  /**
   * 生成受歡迎內容特徵歸納（4 個洞察卡片）
   */
  generateInsights(topicAnalysis, mediaAnalysis) {
    const topPosts = [...this.posts]
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, Math.max(1, Math.ceil(this.posts.length * 0.3))); // 取前 30%

    // 分析高表現貼文的共同特徵
    const topMediaTypes = this.countField(topPosts, 'mediaType');
    const avgMessageLength = topPosts.length > 0 ? (topPosts.reduce((sum, p) => sum + (p.message?.length || 0), 0) / topPosts.length) : 0;

    // 分析發布時間
    const topHours = topPosts.map(p => new Date(p.createdTime).getHours());
    const peakHour = this.findMostFrequent(topHours);

    // 分析互動類型
    const totalReactions = topPosts.reduce((sum, p) => sum + p.reactions, 0);
    const totalComments = topPosts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = topPosts.reduce((sum, p) => sum + p.shares, 0);

    const bestMediaCount = topMediaTypes.length > 0 ? topMediaTypes[0].count : 0;
    const isSampleEnough = topPosts.length >= 3;

    return [
      {
        emoji: '📸',
        label: '素材表現',
        title: isSampleEnough ? `${topMediaTypes[0].value}型素材最受歡迎` : '觀察中',
        description: isSampleEnough ? `高互動貼文中，${Math.round((bestMediaCount / topPosts.length) * 100)}% 使用${topMediaTypes[0].value}格式。此型態內容能更有效吸引粉絲停留與視線。` : '本期有效發文樣本過少，暫時無法分析出具代表性的素材特徵，建議增加發文頻率。',
        borderColor: '#FFA000',
      },
      {
        emoji: '⏰',
        label: '發布時段',
        title: isSampleEnough ? `${peakHour}:00 時段互動最佳` : '觀察中',
        description: isSampleEnough ? `高表現貼文多集中在 ${peakHour}:00 前後發布。建議將重要內容安排在此時段，以最大化觸及與互動率。` : '本期有效發文樣本過少，暫時無法分析出最具指標性的黃金發文時段。',
        borderColor: '#00A0BB',
      },
      {
        emoji: '📝',
        label: '文案結構',
        title: isSampleEnough ? `${avgMessageLength > 200 ? '長文' : '精簡'}文案效果佳` : '觀察中',
        description: isSampleEnough ? `高互動文案平均字數約 ${Math.round(avgMessageLength)} 字。${avgMessageLength > 200 ? '詳細的情境鋪陳與說明更能引發共鳴。' : '精簡扼要的痛點溝通更能快速抓住注意力。'}` : '本期有效發文樣本較少，持續收集文案與點擊數據中。',
        borderColor: '#0057B7',
      },
      {
        emoji: '💬',
        label: '互動機制',
        title: isSampleEnough ? `${totalComments > totalShares ? '留言' : '分享'}驅動互動成長` : '觀察中',
        description: isSampleEnough ? `互動指標分佈：心情 ${totalReactions}、留言 ${totalComments}、分享 ${totalShares}。${totalComments > totalShares ? '引導式提問或誘因有效帶動了大量粉絲留言。' : '實用的乾貨內容促進了受眾主動分享。'}` : '本期有效互動行為數量過少，將持續追蹤各項互動轉化表現。',
        borderColor: '#5CBEB2',
      },
    ];
  }

  /**
   * 生成未來活動策略規劃
   */
  generateActivityPlan(topicAnalysis, mediaAnalysis) {
    const m = this.month;
    const monthsArray = [
      m,
      (m === 12 ? 1 : m + 1),
      (m >= 11 ? (m + 2) % 12 || 12 : m + 2)
    ];

    const holidays = {
      1: { name: '元旦 / 尾牙', concept: '過年大掃除準備', seasonId: '冬' },
      2: { name: '春節 / 情人節 / 元宵', concept: '感冒交叉感染防護', seasonId: '冬' },
      3: { name: '婦女節 / 春分', concept: '換季衣物整理 / 花粉過敏', seasonId: '春' },
      4: { name: '兒童節(4/4) / 地球日(4/22)', concept: '小兒肌膚保護 / 梅雨防霉', seasonId: '春' },
      5: { name: '母親節 / 世界候鳥日', concept: '換季除蟎防霉', seasonId: '春' },
      6: { name: '世界環境日(6/5) / 夏至', concept: '換季出汗 / 洗衣頻率增加', seasonId: '夏' },
      7: { name: '暑假開始 / 地球日延伸', concept: '防蟎抗菌需求上升 / 缺水節水', seasonId: '夏' },
      8: { name: '父親節(8/8) / 七夕', concept: '運動汗味 / 衣物異味殘留', seasonId: '夏' },
      9: { name: '中秋節 / 世界清潔日', concept: '烤肉異味去除', seasonId: '秋' },
      10: { name: '國慶日 / 萬聖節', concept: '換季棉被清洗 / 乾燥靜電', seasonId: '秋' },
      11: { name: '光棍節 / 感恩節', concept: '灰塵塵蟎 / 冬衣整理', seasonId: '秋' },
      12: { name: '聖誕節 / 跨年', concept: '冷水洗衣效果 / 冬衣除蟎', seasonId: '冬' }
    };

    const painPointsMap = {
      '春': '春天氣候多變，常遇到【換季過敏】與【梅雨悶臭】困擾',
      '夏': '炎熱夏季容易有【流汗異味殘留】及【頻繁洗滌、防蟎】需求',
      '秋': '秋天面臨【換季被毯清洗】與乾燥引起的【靜電與塵蟎】問題',
      '冬': '冬季水溫低【冷水洗衣溶解度】受限，且需提防家人【感冒交叉感染】'
    };

    let plan = [];
    
    // 近期月份 1
    let m1 = monthsArray[0];
    let h1 = holidays[m1];
    plan.push({
      timing: `${m1}月 (${h1.name})`,
      direction: `節慶行銷與痛點解答`,
      material: '情境短影音 / 步驟圖卡',
      benefit: `以${painPointsMap[h1.seasonId]}為切入點，自然點出台塑環保洗劑（或補充站）的便利與無殘留特性，產生生活共鳴。`
    });

    // 近期月份 2
    let m2 = monthsArray[1];
    let h2 = holidays[m2];
    plan.push({
      timing: `${m2}月 (${h2.name})`,
      direction: `互動式主題徵文 (品牌理念)`,
      material: '趣味抽獎圖文',
      benefit: `結合「${h2.name}」與環保理念，以「你的${h2.concept}抗戰法寶」邀請粉絲留言，推升活躍度。`
    });

    // 近期月份 3
    let m3 = monthsArray[2];
    let h3 = holidays[m3];
    plan.push({
      timing: `${m3}月 (${h3.name})`,
      direction: `深度科普小學堂`,
      material: '知識懶人包 (相簿型)',
      benefit: `針對${painPointsMap[h3.seasonId]}，深度解析洗劑成分與地球永續的關聯性，強化「選對洗劑也能保護環境與家人」的品牌信任。`
    });

    plan.push({
      timing: '常態性推廣規劃',
      direction: '新戶無痛入坑指南 / 補充站尋寶',
      material: '滿版強勢單圖 + 留言區連結',
      benefit: '持續引流欲找尋機台的散戶，定期提供最新實體與數位機台使用教學，化解潛在猶豫客群的疑慮。'
    });

    return plan;
  }

  // ========== 工具方法 ==========

  countField(posts, field) {
    const map = new Map();
    posts.forEach(p => {
      const val = p[field];
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }

  findMostFrequent(arr) {
    const freq = {};
    arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
  }

  getMonthName(month) {
    const names = ['', '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return names[month] || '';
  }
}

module.exports = DataAnalyzer;
