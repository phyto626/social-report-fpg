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
    const suggestions = this.generateSuggestions(topicAnalysis, mediaAnalysis);
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
      suggestions,
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
      .slice(0, Math.ceil(this.posts.length * 0.3)); // 取前 30%

    // 分析高表現貼文的共同特徵
    const topMediaTypes = this.countField(topPosts, 'mediaType');
    const avgMessageLength = topPosts.reduce((sum, p) => sum + (p.message?.length || 0), 0) / topPosts.length;

    // 分析發布時間
    const topHours = topPosts.map(p => new Date(p.createdTime).getHours());
    const peakHour = this.findMostFrequent(topHours);

    // 分析互動類型
    const totalReactions = topPosts.reduce((sum, p) => sum + p.reactions, 0);
    const totalComments = topPosts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = topPosts.reduce((sum, p) => sum + p.shares, 0);

    const bestMediaType = topMediaTypes.length > 0 ? topMediaTypes[0].value : '照片';
    const bestMediaPct = topMediaTypes.length > 0
      ? Math.round((topMediaTypes[0].count / topPosts.length) * 100)
      : 0;

    return [
      {
        emoji: '📸',
        title: `${bestMediaType}型素材最受歡迎`,
        description: `高互動貼文中，${bestMediaPct}% 使用${bestMediaType}格式。${bestMediaType}型內容能更有效吸引粉絲停留與互動。`,
        borderColor: '#FFA000',
      },
      {
        emoji: '⏰',
        title: `${peakHour}:00 時段互動最佳`,
        description: `高表現貼文多集中在 ${peakHour}:00 前後發布。建議將重要內容安排在此時段，以最大化觸及與互動率。`,
        borderColor: '#00A0BB',
      },
      {
        emoji: '📝',
        title: `${avgMessageLength > 200 ? '長文' : '精簡'}文案效果佳`,
        description: `高互動貼文平均文字長度約 ${Math.round(avgMessageLength)} 字。${avgMessageLength > 200 ? '詳細的內容說明能引發更多共鳴與討論' : '簡潔有力的文案更能快速抓住粉絲注意力'}。`,
        borderColor: '#0057B7',
      },
      {
        emoji: '💬',
        title: `${totalComments > totalShares ? '留言' : '分享'}驅動互動成長`,
        description: `高互動貼文的互動構成：心情 ${totalReactions}、留言 ${totalComments}、分享 ${totalShares}。${totalComments > totalShares ? '引導式問句與互動機制有效提升留言數' : '實用、有價值的內容促進粉絲主動分享'}。`,
        borderColor: '#5CBEB2',
      },
    ];
  }

  /**
   * 生成優化方向建議（3 張策略卡片）
   */
  generateSuggestions(topicAnalysis, mediaAnalysis) {
    const bestMedia = mediaAnalysis[0];
    const worstMedia = mediaAnalysis[mediaAnalysis.length - 1];
    const bestTopic = topicAnalysis.length > 0 ? topicAnalysis[0] : null;

    const avgReach = this.posts.reduce((sum, p) => sum + p.reach, 0) / this.posts.length;
    const lowReachPosts = this.posts.filter(p => p.reach < avgReach * 0.5);

    return [
      {
        number: '01',
        title: '內容策略優化',
        gradient: 'linear-gradient(135deg, #0057B7, #00A0BB)',
        suggestions: [
          `增加${bestMedia ? bestMedia.type : '照片'}型素材的發布比例，此類型互動率最高達 ${bestMedia ? (bestMedia.engagementRate * 100).toFixed(1) : 0}%`,
          `${bestTopic ? `參考「${bestTopic.topic.substring(0, 15)}」主題的成功模式` : '持續優化高互動主題內容'}，延伸類似主題的系列內容`,
          `針對觸及低於平均的 ${lowReachPosts.length} 篇貼文，重新檢視發布時間與內容結構`,
          '加入更多互動式內容（投票、問答、限時優惠），提高粉絲參與度',
        ],
      },
      {
        number: '02',
        title: '互動提升方案',
        gradient: 'linear-gradient(135deg, #FFA000, #E67E00)',
        suggestions: [
          '在貼文中加入明確的行動呼籲（CTA），如「留言分享你的使用心得」',
          '善用限時優惠或抽獎機制，創造緊迫感帶動互動',
          `${worstMedia ? `嘗試將${worstMedia.type}型內容結合其他素材型式，提升整體表現` : '持續測試不同素材組合'}`,
          '回覆粉絲留言以維持對話熱度，提高演算法推送機率',
        ],
      },
      {
        number: '03',
        title: '觸及擴展計畫',
        gradient: 'linear-gradient(135deg, #5CBEB2, #00A0BB)',
        suggestions: [
          '建立固定發文節奏，每週至少發布 3-4 篇內容維持粉絲黏著度',
          '跨平台推廣策略：將高互動貼文改編至 IG Reels / LINE 社群同步曝光',
          '與在地商家或 KOL 合作，透過聯合行銷拓展新受眾',
          `目前追蹤數 ${this.pageInfo.followersCount.toLocaleString()} 人，設定下月成長 5% 的目標並追蹤進展`,
        ],
      },
    ];
  }

  /**
   * 生成未來活動策略規劃
   */
  generateActivityPlan(topicAnalysis, mediaAnalysis) {
    const currentMonth = this.month;
    const nextMonths = [
      this.getMonthName((currentMonth % 12) + 1),
      this.getMonthName(((currentMonth + 1) % 12) + 1),
      this.getMonthName(((currentMonth + 2) % 12) + 1),
    ];

    const bestMedia = mediaAnalysis[0];
    const bestMediaType = bestMedia ? bestMedia.type : '照片';

    return [
      {
        timing: `${nextMonths[0]}上旬`,
        direction: '季節性主題行銷',
        material: `${bestMediaType} + 限時動態`,
        benefit: '結合當季議題提升觸及，預估觸及成長 10-15%',
      },
      {
        timing: `${nextMonths[0]}中旬`,
        direction: '粉絲互動活動（留言抽獎）',
        material: '精美圖片 + 互動貼文',
        benefit: '透過獎勵機制提升互動率，目標留言數成長 30%',
      },
      {
        timing: `${nextMonths[1]}`,
        direction: '品牌故事系列',
        material: '影片 + 圖文卡片',
        benefit: '深化品牌形象，建立粉絲情感連結',
      },
      {
        timing: `${nextMonths[1]}下旬`,
        direction: '在地合作推廣',
        material: `${bestMediaType} + 聯名素材`,
        benefit: '透過合作夥伴觸及新受眾，預估粉絲成長 5-8%',
      },
      {
        timing: `${nextMonths[2]}`,
        direction: 'UGC 徵集活動',
        material: '用戶原創內容 + 精選分享',
        benefit: '降低內容產製成本，同時提升社群歸屬感與分享率',
      },
    ];
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
