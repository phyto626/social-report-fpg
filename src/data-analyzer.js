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
    if (this.posts.length < 3) {
      // 樣本過少，回傳觀察中
      const empty = {
        title: '觀察中',
        description: '本期樣本不足，建議持續觀察。',
        borderColor: '#e2e8f0',
      };
      return [
        { emoji: '📐', label: '內容結構', ...empty },
        { emoji: '🗣️', label: '敘事角度', ...empty },
        { emoji: '🎭', label: '文案語氣', ...empty },
        { emoji: '🎯', label: 'CTA 設計', ...empty }
      ];
    }

    const sortedPosts = [...this.posts].sort((a, b) => b.engagementRate - a.engagementRate);
    const topCount = Math.ceil(this.posts.length / 3);
    const highGroup = sortedPosts.slice(0, topCount);
    const lowGroup = sortedPosts.slice(topCount);

    const calcGroupMetric = (group, conditionFn) => {
      if (group.length === 0) return 0;
      const matched = group.filter(conditionFn);
      const totalReactions = matched.reduce((sum, p) => sum + p.totalEngagement, 0);
      const totalReach = matched.reduce((sum, p) => sum + p.reach, 0);
      return totalReach > 0 ? (totalReactions / totalReach) : 0;
    };

    const hasParam = (post, regex) => regex.test(post.message || '');

    const dimList = [];

    // 1. 內容結構 (問答、條列)
    const isEcoco = this.pageInfo && (this.pageInfo.name.toLowerCase().includes('ecoco') || this.pageInfo.name.toLowerCase().includes('eco'));
    
    // 1. 內容結構 (問答、條列)
    const structRegex = /[?？1-9\.]|步驟|如何|公告|提醒|上線/i;
    const highStructRate = calcGroupMetric(highGroup, p => hasParam(p, structRegex));
    const lowStructRate = calcGroupMetric(lowGroup, p => hasParam(p, structRegex));
    
    // 2. 敘事角度 (真人故事 vs 產品特性)
    const storyRegex = isEcoco ? /大家|分享|朋友|家人/i : /我|你|大家|朋友|小孩|里長/i;
    const highStoryRate = calcGroupMetric(highGroup, p => hasParam(p, storyRegex));
    const lowStoryRate = calcGroupMetric(lowGroup, p => hasParam(p, storyRegex));

    // 3. 文案語氣 (生活感語氣詞)
    const casualRegex = /啦|喔|啊|哈|😂|😆|😍|❤️/i;
    const highCasualRate = calcGroupMetric(highGroup, p => hasParam(p, casualRegex));
    const lowCasualRate = calcGroupMetric(lowGroup, p => hasParam(p, casualRegex));

    // 4. 情感誘因 (痛點或情感)
    const emotionRegex = isEcoco ? /環保|地球|點數|回饋|優惠|滿桶|電池|永續/i : /怕|錯過|煩惱|擔心|一起|愛/i;
    const highEmotionRate = calcGroupMetric(highGroup, p => hasParam(p, emotionRegex));
    const lowEmotionRate = calcGroupMetric(lowGroup, p => hasParam(p, emotionRegex));

    // 5. 素材型式
    const hasVisualType = (post) => ['影片', '相簿', '照片'].includes(post.mediaType);
    const avgVisualRate = calcGroupMetric(this.posts, hasVisualType);
    const avgOtherRate = calcGroupMetric(this.posts, p => !hasVisualType(p));

    // 6. CTA 設計
    const ctaRegex = /留言|連結|點擊|這裡看|分享|LINE/i;
    const avgCtaRate = calcGroupMetric(this.posts, p => hasParam(p, ctaRegex));
    const avgNoCtaRate = calcGroupMetric(this.posts, p => !hasParam(p, ctaRegex));

    // 構建 6 個維度比較結果
    // 選取 4 個差異最大或最有意義的維度呈現
    const formatPct = val => (val * 100).toFixed(1) + '%';

    dimList.push({
      id: 'cta', emoji: '🎯', label: 'CTA 設計', diff: Math.abs(avgCtaRate - avgNoCtaRate),
      title: avgCtaRate >= avgNoCtaRate ? '明確行動呼籲帶動整體互動' : '未帶連結貼文互動率較高',
      description: `帶有明確行動呼籲(如留言/加LINE)的貼文總平均互動率為 ${formatPct(avgCtaRate)}，無 CTA 則為 ${formatPct(avgNoCtaRate)}。`
    });

    dimList.push({
      id: 'struct', emoji: '📐', label: '內容結構', diff: Math.abs(highStructRate - lowStructRate),
      title: highStructRate > lowStructRate ? '提問式與條列步驟效果佳' : '一般直敘形式較受歡迎',
      description: `高表現內容具備提問/條列格式的互動率達 ${formatPct(highStructRate)}，對照低表現群僅 ${formatPct(lowStructRate)}。`
    });

    dimList.push({
      id: 'story', emoji: '🗣️', label: '敘事角度', diff: Math.abs(highStoryRate - lowStoryRate),
      title: highStoryRate > lowStoryRate ? (isEcoco ? '社區/人物故事能拉近距離' : '真實人物視角較引發共鳴') : (isEcoco ? '新點與服務公告為主軸' : '產品功能溝通為本期主軸'),
      description: `採用「你/我/大家」或在地故事的高表現群，互動率達 ${formatPct(highStoryRate)}，低表現群為 ${formatPct(lowStoryRate)}。`
    });

    dimList.push({
      id: 'emotion', emoji: '❤️', label: '情感誘因', diff: Math.abs(highEmotionRate - lowEmotionRate),
      title: highEmotionRate > lowEmotionRate ? (isEcoco ? '點數回饋與循環永續引發共鳴' : '痛點與參與感為流量密碼') : '抽獎等實質誘因較能帶動話題',
      description: `高表現貼文中包含解決痛點或情感共鳴的互動率達 ${formatPct(highEmotionRate)}，低表現群為 ${formatPct(lowEmotionRate)}。`
    });

    dimList.push({
      id: 'tone', emoji: '🎭', label: '文案語氣', diff: Math.abs(highCasualRate - lowCasualRate),
      title: highCasualRate > lowCasualRate ? '生活化/口語化語氣更容易拉近距離' : '正式的品牌語氣更能建立信賴',
      description: `帶有生活化語助詞或Emoji的高表現群互動率達 ${formatPct(highCasualRate)}，低表現群為 ${formatPct(lowCasualRate)}。`
    });

    dimList.push({
      id: 'visual', emoji: '🖼️', label: '素材型式', diff: Math.abs(avgVisualRate - avgOtherRate),
      title: avgVisualRate >= avgOtherRate ? '視覺型素材(圖卡/影片)能有效帶動指標' : '純淨形式的素材更易被閱讀',
      description: `圖片/短影片類型素材平均互動率為 ${formatPct(avgVisualRate)}，相對其他類型文字為主則為 ${formatPct(avgOtherRate)}。`
    });

    // 依差距(差異顯著度)排序，取前四名
    dimList.sort((a, b) => b.diff - a.diff);
    const top4 = dimList.slice(0, 4);
    
    // 賦予固定的邊框顏色：橘、青、藍、綠
    const colors = ['#FFA000', '#00A0BB', '#0057B7', '#5CBEB2'];
    top4.forEach((item, idx) => {
      item.borderColor = colors[idx];
    });

    return top4;
  }

  /**
   * 生成未來活動策略規劃
   */
  generateActivityPlan(topicAnalysis, mediaAnalysis) {
    const isEcoco = this.pageInfo && (this.pageInfo.name.toLowerCase().includes('ecoco') || this.pageInfo.name.toLowerCase().includes('eco'));
    const m = this.month;
    const monthsArray = [ m, (m === 12 ? 1 : m + 1), (m >= 11 ? (m + 2) % 12 || 12 : m + 2) ];

    let holidays = {};
    let painPointsMap = {};
    if (isEcoco) {
      holidays = {
        1: { name: '元旦 / 尾牙', concept: '大掃除空瓶回收', seasonId: '冬' },
        2: { name: '春節 / 元宵', concept: '走春飲品回收', seasonId: '冬' },
        3: { name: '植樹節 / 春分', concept: '植樹與綠色循環', seasonId: '春' },
        4: { name: '兒童節(4/4) / 地球日(4/22)', concept: '小小永續英雄', seasonId: '春' },
        5: { name: '母親節', concept: '家庭回收總動員', seasonId: '春' },
        6: { name: '世界環境日(6/5)', concept: '夏季飲品爆量回收', seasonId: '夏' },
        7: { name: '暑假開始 / 手搖飲旺季', concept: '降溫飲料杯大作戰', seasonId: '夏' },
        8: { name: '父親節 / 氣候高峰', concept: '減碳降溫大行動', seasonId: '夏' },
        9: { name: '中秋節 / 烤肉季', concept: '烤肉飲品空瓶整理', seasonId: '秋' },
        10: { name: '雙十節 / 萬聖節', concept: '家電汰換廢電池', seasonId: '秋' },
        11: { name: '雙11 / 網購季', concept: '過度包裝與減量', seasonId: '秋' },
        12: { name: '聖誕節 / 跨年', concept: '年末斷捨離舊抽屜電池', seasonId: '冬' }
      };
      painPointsMap = {
        '春': '春休連假出遊頻繁，產生較多【寶特瓶與手搖杯】空瓶',
        '夏': '夏日炎熱，【飲料杯與水瓶】回收需求大幅增加，機台易滿',
        '秋': '秋季家電與秋季大整理，許多家庭開始出清【廢棄乾電池與舊手機】',
        '冬': '年末大掃除，清出許多積壓的【各類回收空瓶與廢電池】'
      };
    } else {
      holidays = {
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
      painPointsMap = {
        '春': '春天氣候多變，常遇到【換季過敏】與【梅雨悶臭】困擾',
        '夏': '炎熱夏季容易有【流汗異味殘留】及【頻繁洗滌、防蟎】需求',
        '秋': '秋天面臨【換季被毯清洗】與乾燥引起的【靜電與塵蟎】問題',
        '冬': '冬季水溫低【冷水洗衣溶解度】受限，且需提防家人【感冒交叉感染】'
      };
    }

    let plan = [];
    
    // 近期月份 1
    let m1 = monthsArray[0];
    let h1 = holidays[m1];
    plan.push({
      timing: `${m1}月 (${h1.name})`,
      direction: `節慶行銷與痛點解答`,
      material: '情境短影音 / 步驟圖卡',
      benefit: isEcoco 
        ? `以${painPointsMap[h1.seasonId]}為切入點，提醒民眾帶著空瓶/電池來 ECOCO 機台回收，賺點數還能做環保，順便消耗囤積物。` 
        : `以${painPointsMap[h1.seasonId]}為切入點，自然點出台塑環保洗劑（或補充站）的便利與無殘留特性，產生生活共鳴。`
    });

    // 近期月份 2
    let m2 = monthsArray[1];
    let h2 = holidays[m2];
    plan.push({
      timing: `${m2}月 (${h2.name})`,
      direction: `互動式主題徵文 (品牌理念)`,
      material: '趣味抽獎圖文',
      benefit: isEcoco
        ? `結合「${h2.name}」與循環經濟理念，以「你的${h2.concept}環保任務」邀請粉絲留言曬出回收戰績，推升活躍度。`
        : `結合「${h2.name}」與環保理念，以「你的${h2.concept}抗戰法寶」邀請粉絲留言，推升活躍度。`
    });

    // 近期月份 3
    let m3 = monthsArray[2];
    let h3 = holidays[m3];
    plan.push({
      timing: `${m3}月 (${h3.name})`,
      direction: `深度科普小學堂`,
      material: '知識懶人包 (相簿型)',
      benefit: isEcoco
        ? `針對回收迷思，深度解析這三個月常見的「不能投的規格/材質」，避免現場客訴，並強化「精準分類=保護地球」的公民意識。`
        : `針對${painPointsMap[h3.seasonId]}，深度解析洗劑成分與地球永續的關聯性，強化「選對洗劑也能保護環境與家人」的品牌信任。`
    });

    plan.push({
      timing: '常態性推廣規劃',
      direction: isEcoco ? 'APP操作不卡關 / 機台擴點快報' : '新戶無痛入坑指南 / 補充站尋寶',
      material: '滿版強勢單圖 + 留言區連結',
      benefit: isEcoco 
        ? '針對新手用戶，持續提供最新的實體機台地圖與 APP 點數折抵教學，化解新戶不會用或找不到的痛點。'
        : '持續引流欲找尋機台的散戶，定期提供最新實體與數位機台使用教學，化解潛在猶豫客群的疑慮。'
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
