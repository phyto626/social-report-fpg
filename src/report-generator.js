/**
 * HTML 報告生成器
 * 根據 SKILL 規範生成完整的社群成果分析報告
 */

class ReportGenerator {
  constructor(analysisResult) {
    this.data = analysisResult;
    this.brandName = analysisResult.pageInfo.name || '洗衣精補充站';
    this.startDate = analysisResult.startDate;
    this.endDate = analysisResult.endDate;
    this.year = analysisResult.startDate ? analysisResult.startDate.substring(0, 4) : '2026';
    this.month = analysisResult.startDate ? analysisResult.startDate.substring(5, 7) : '01';

    // Theme logic
    const isEcoco = this.brandName.toLowerCase().includes('ecoco') || this.brandName.toLowerCase().includes('eco');
    this.c = {
      primary: isEcoco ? '#060E9F' : '#0057B7',
      primaryDark: isEcoco ? '#060E9F' : '#003d82',
      primaryLight: isEcoco ? '#0076A9' : '#00A0BB',
      secondary: isEcoco ? '#FF5000' : '#FFA000',
      accent: isEcoco ? '#FFCE00' : '#5CBEB2',
      accent2: isEcoco ? '#8EB8C9' : '#7B1FA2',
      orangeAlert: isEcoco ? '#FF5000' : '#E67E00',
      bgLight: isEcoco ? '#ffffff' : '#f7f9fc',
      bgHighlight: isEcoco ? '#FAE0B8' : '#f0f7ff',
      border: isEcoco ? '#8EB8C9' : '#D4EAED',
      shadowPrimary: isEcoco ? 'rgba(6,14,159,0.08)' : '${this.c.shadowPrimary}',
      gradTop: isEcoco ? 'linear-gradient(135deg, #060E9F, #060E9F)' : 'linear-gradient(135deg, #003d82 0%, #0057B7 50%, #00A0BB 100%)',
      gradTable: isEcoco ? 'linear-gradient(135deg, #0076A9, #060E9F)' : 'linear-gradient(135deg, #00A0BB, #0057B7)',
      colorsArr: isEcoco ? ['#060E9F', '#0076A9', '#FFCE00', '#FF5000', '#8EB8C9'] : ['#0057B7', '#00A0BB', '#5CBEB2', '#FFA000', '#7B1FA2']
    };
  }

  /**
   * 生成完整 HTML 報告
   */
  generate() {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.brandName} ${this.startDate} ~ ${this.endDate} 社群成果分析報告</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <style>${this.getStyles()}</style>
</head>
<body>
  ${this.generateHeader()}
  <div class="container">
    ${this.generateDataQualityBanner()}
    ${this.generateTOC()}
    ${this.generateKPI()}
    ${this.generateTopPostHighlight()}
    ${this.generateContentAnalysis()}
    ${this.generatePostTable()}
    ${this.generateInsightCards()}
    ${this.generateCommentInsights()}
    ${this.generateActivityPlan()}
  </div>
  ${this.generateFooter()}
</body>
</html>`;
  }

  /**
   * CSS 樣式
   */
  getStyles() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: 'Noto Sans TC', sans-serif;
        background: ${this.c.bgLight};
        color: #2d3748;
        line-height: 1.6;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px 60px;
      }

      .data-quality-banner {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 12px;
        padding: 16px 20px;
        margin: 24px 0 8px;
        color: #78350f;
        font-size: 0.9em;
        line-height: 1.65;
      }

      .data-quality-banner ul {
        margin: 8px 0 0 1.2em;
        padding: 0;
      }

      .report-toc {
        background: #fff;
        border: 1px solid ${this.c.border};
        border-radius: 12px;
        padding: 20px 24px;
        margin: 20px 0 32px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }

      .report-toc .toc-title {
        font-size: 1em;
        font-weight: 700;
        color: ${this.c.primary};
        margin-bottom: 12px;
      }

      .report-toc ol {
        margin: 0;
        padding-left: 1.25em;
        line-height: 2;
      }

      .report-toc a {
        color: ${this.c.primary};
        text-decoration: none;
        font-weight: 500;
      }

      .report-toc a:hover {
        text-decoration: underline;
      }

      .report-section {
        scroll-margin-top: 16px;
      }

      /* ===== 頁首 ===== */
      .report-header {
        background: ${this.c.gradTop};
        color: #fff;
        padding: 60px 40px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }

      .report-header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%);
        animation: shimmer 8s ease-in-out infinite;
      }

      @keyframes shimmer {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(5%, 5%); }
      }

      .report-header h1 {
        font-size: 2.4em;
        font-weight: 900;
        letter-spacing: 2px;
        margin-bottom: 8px;
        position: relative;
        z-index: 1;
      }

      .report-header .subtitle {
        font-size: 1.15em;
        font-weight: 300;
        opacity: 0.9;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
      }

      .header-meta {
        display: flex;
        justify-content: center;
        gap: 30px;
        font-size: 0.95em;
        opacity: 0.85;
        position: relative;
        z-index: 1;
      }

      .header-meta span {
        background: rgba(255,255,255,0.15);
        padding: 6px 18px;
        border-radius: 20px;
        backdrop-filter: blur(10px);
      }

      /* ===== 區塊標題 ===== */
      .section-title {
        font-size: 1.4em;
        font-weight: 700;
        color: ${this.c.primary};
        margin: 48px 0 24px;
        padding-bottom: 12px;
        border-bottom: 3px solid ${this.c.border};
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .section-title .icon {
        font-size: 1.2em;
      }

      /* ===== KPI ===== */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin: 36px 0;
      }

      .kpi-card {
        background: #fff;
        border-radius: 16px;
        padding: 28px 24px;
        text-align: center;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        border-top: 4px solid;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .kpi-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      }

      .kpi-card .kpi-value {
        font-size: 2.2em;
        font-weight: 900;
        margin: 8px 0;
      }

      .kpi-card .kpi-label {
        font-size: 0.9em;
        color: #718096;
        font-weight: 500;
      }

      .kpi-card .kpi-icon {
        font-size: 1.8em;
      }

      /* ===== Highlight ===== */
      .highlight-card {
        background: linear-gradient(135deg, #fff 0%, ${this.c.bgHighlight} 100%);
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 2px 16px ${this.c.shadowPrimary};
        border-left: 5px solid ${this.c.primary};
        margin: 24px 0;
      }

      .highlight-card .highlight-title {
        font-size: 1.15em;
        font-weight: 700;
        color: ${this.c.primaryDark};
        margin-bottom: 16px;
      }

      .highlight-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-top: 20px;
      }

      .highlight-stat {
        text-align: center;
        padding: 12px;
        background: rgba(255,255,255,0.8);
        border-radius: 10px;
      }

      .highlight-stat .stat-value {
        font-size: 1.5em;
        font-weight: 700;
        color: ${this.c.primary};
      }

      .highlight-stat .stat-label {
        font-size: 0.8em;
        color: #718096;
        margin-top: 2px;
      }

      .highlight-excerpt {
        color: #4a5568;
        font-size: 0.95em;
        line-height: 1.8;
        margin: 12px 0;
        padding: 12px 16px;
        background: rgba(255,255,255,0.6);
        border-radius: 8px;
      }

      /* ===== 內容分析（雙欄） ===== */
      .analysis-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin: 24px 0;
      }

      .analysis-panel {
        background: #fff;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }

      .analysis-panel h3 {
        font-size: 1.05em;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid ${this.c.border};
      }

      /* 排名表 */
      .rank-table {
        width: 100%;
        border-collapse: collapse;
      }

      .rank-table th {
        text-align: left;
        font-size: 0.8em;
        color: #718096;
        font-weight: 500;
        padding: 8px 0;
        border-bottom: 1px solid #e2e8f0;
      }

      .rank-table td {
        padding: 10px 0;
        font-size: 0.9em;
        border-bottom: 1px solid #f0f0f0;
      }

      .rank-table .rank-num {
        font-weight: 700;
        color: ${this.c.primary};
        width: 35px;
      }

      .progress-bar-wrapper {
        background: #f0f0f0;
        border-radius: 8px;
        height: 20px;
        overflow: hidden;
        min-width: 100px;
      }

      .progress-bar {
        height: 100%;
        border-radius: 8px;
        display: flex;
        align-items: center;
        padding-left: 8px;
        font-size: 0.75em;
        font-weight: 600;
        color: #fff;
        transition: width 0.8s ease;
      }

      /* 素材分析 */
      .media-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .media-item:last-child { border-bottom: none; }

      .media-item .media-name {
        font-weight: 600;
        width: 60px;
        flex-shrink: 0;
      }

      .media-item .media-stats {
        font-size: 0.8em;
        color: #718096;
        margin-left: auto;
        text-align: right;
        flex-shrink: 0;
      }

      /* 長條圖 */
      .bar-chart {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 2px solid ${this.c.border};
      }

      .bar-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      .bar-label {
        width: 60px;
        font-size: 0.85em;
        font-weight: 500;
        flex-shrink: 0;
        text-align: right;
      }

      .bar-container {
        flex: 1;
        background: #f0f0f0;
        border-radius: 6px;
        height: 28px;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        border-radius: 6px;
        display: flex;
        align-items: center;
        padding-left: 10px;
        font-size: 0.8em;
        font-weight: 600;
        color: #fff;
      }

      .data-insight {
        background: ${this.c.bgLight};
        padding: 16px;
        border-radius: 10px;
        margin-top: 16px;
        font-size: 0.9em;
        color: #4a5568;
        line-height: 1.7;
        border-left: 3px solid ${this.c.primaryLight};
      }

      /* ===== 貼文明細表 ===== */
      .post-table-wrapper {
        overflow-x: auto;
        margin: 24px 0;
        border-radius: 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }

      .post-table {
        width: 100%;
        border-collapse: collapse;
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
      }

      .post-table thead {
        background: ${this.c.gradTop};
        color: #fff;
      }

      .post-table thead th {
        padding: 14px 16px;
        font-size: 0.85em;
        font-weight: 600;
        text-align: left;
        white-space: nowrap;
        position: sticky;
        top: 0;
        z-index: 3;
        box-shadow: 0 1px 0 rgba(255,255,255,0.2);
      }

      .post-table tbody tr {
        transition: background 0.2s;
      }

      .post-table tbody tr:nth-child(even) {
        background: #f9fafb;
      }

      .post-table tbody tr:hover {
        background: #e8f2ff;
      }

      .post-table td {
        padding: 12px 16px;
        font-size: 0.88em;
        border-bottom: 1px solid #f0f0f0;
      }

      .post-table .post-title-cell {
        max-width: 250px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .post-table .num-cell {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: 600;
      }

      .badge-photo { background: #e8f2ff; color: ${this.c.primary}; }
      .badge-video { background: #fff3e0; color: ${this.c.orangeAlert}; }
      .badge-album { background: #e0f7f5; color: #00897B; }
      .badge-link { background: #f3e5f5; color: ${this.c.accent2}; }
      .badge-text { background: #f0f0f0; color: #666; }
      .badge-other { background: #f5f5f5; color: #999; }

      .mini-progress {
        background: #f0f0f0;
        border-radius: 6px;
        height: 16px;
        overflow: hidden;
        min-width: 80px;
        display: flex;
        align-items: center;
      }

      .mini-progress .fill {
        height: 100%;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7em;
        font-weight: 600;
        color: #fff;
        min-width: 30px;
      }

      /* ===== Insight Cards (2x2) ===== */
      .insight-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 24px 0;
      }

      .insight-card {
        background: #fff;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        border-left: 5px solid;
        transition: transform 0.2s;
      }

      .insight-card:hover {
        transform: translateY(-2px);
      }

      .insight-card .insight-emoji {
        font-size: 2em;
        margin-bottom: 5px;
      }

      .insight-card .insight-label {
        font-size: 0.8em;
        font-weight: 600;
        color: #718096;
        background: #f0f4f8;
        padding: 4px 10px;
        border-radius: 12px;
        display: inline-block;
        margin-bottom: 12px;
      }

      .insight-card .insight-title {
        font-size: 1.05em;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 8px;
      }

      .insight-card .insight-desc {
        font-size: 0.9em;
        color: #718096;
        line-height: 1.7;
      }

      /* ===== 活動策略表 ===== */
      .activity-table-wrapper {
        overflow-x: auto;
        margin: 24px 0;
        border-radius: 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }

      .activity-table {
        width: 100%;
        border-collapse: collapse;
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
      }

      .activity-table thead {
        background: ${this.c.gradTable};
        color: #fff;
      }

      .activity-table thead th {
        padding: 14px 20px;
        font-size: 0.9em;
        font-weight: 600;
        text-align: left;
      }

      .activity-table td {
        padding: 16px 20px;
        font-size: 0.9em;
        border-bottom: 1px solid #f0f0f0;
        line-height: 1.6;
      }

      .activity-table tbody tr:nth-child(even) {
        background: #f9fafb;
      }

      .activity-table tbody tr:hover {
        background: #e8f2ff;
      }

      .timing-badge {
        display: inline-block;
        background: #e8f2ff;
        color: ${this.c.primary};
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.85em;
      }

      /* ===== 留言洞察卡片 ===== */
      .comment-insight-wrapper {
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        padding: 32px;
        margin: 24px 0;
      }
      .comment-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-top: 20px;
      }
      .comment-box {
        background: ${this.c.bgLight};
        padding: 24px;
        border-radius: 12px;
        border-left: 4px solid ${this.c.primary};
      }
      .comment-box h4 {
        font-size: 1.1em;
        color: ${this.c.primaryDark};
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .comment-box p {
        font-size: 0.9em;
        color: #4a5568;
        margin-bottom: 16px;
        line-height: 1.6;
      }
      .comment-box .action {
        background: #e8f2ff;
        color: ${this.c.primary};
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 0.85em;
        font-weight: 600;
      }

      /* ===== 頁尾 ===== */
      .report-footer {
        background: ${this.c.gradTop};
        color: #fff;
        text-align: center;
        padding: 36px 24px;
        margin-top: 48px;
      }

      .report-footer .footer-brand {
        font-size: 1.3em;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .report-footer .footer-stats {
        font-size: 0.9em;
        opacity: 0.8;
        display: flex;
        justify-content: center;
        gap: 24px;
      }

      .report-footer .footer-note {
        margin-top: 16px;
        font-size: 0.8em;
        opacity: 0.6;
      }

      /* ===== RWD ===== */
      @media (max-width: 900px) {
        .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        .analysis-grid { grid-template-columns: 1fr; }
        .highlight-stats { grid-template-columns: repeat(2, 1fr); }
      }

      @media (max-width: 600px) {
        .kpi-grid { grid-template-columns: 1fr; }
        .insight-grid { grid-template-columns: 1fr; }
        .report-header { padding: 40px 20px; }
        .report-header h1 { font-size: 1.6em; }
      }

      .scroll-hint {
        display: none;
        font-size: 0.8em;
        color: #718096;
        margin-bottom: 8px;
      }

      @media (max-width: 900px) {
        .scroll-hint { display: block; }
      }

      /* 列印最佳化 */
      @media print {
        body { background: #fff; }
        .kpi-card:hover, .insight-card:hover { transform: none; }
        .report-header::before { display: none; }
        .report-toc { break-inside: avoid; page-break-inside: avoid; }
        .data-quality-banner { break-inside: avoid; background: #fff; }
        .report-section { break-inside: avoid; }
        .highlight-card, .insight-card { break-inside: avoid; }
        .post-table thead th {
          position: static;
          box-shadow: none;
        }
        .scroll-hint { display: none; }
      }
    `;
  }

  generateDataQualityBanner() {
    const dq = this.data.dataQuality;
    if (!dq || !dq.disclaimers || dq.disclaimers.length === 0) return '';
    const items = dq.disclaimers.map((t) => `<li>${this.escapeHtml(t)}</li>`).join('');
    return `
    <div class="data-quality-banner" role="status">
      <strong>資料品質說明</strong>
      <ul>${items}</ul>
    </div>`;
  }

  generateTOC() {
    return `
    <nav class="report-toc" aria-label="報告目錄">
      <div class="toc-title">目錄</div>
      <ol>
        <li><a href="#sec-kpi">KPI 概覽</a></li>
        <li><a href="#sec-top">本期互動率最高貼文</a></li>
        <li><a href="#sec-content">內容表現分析</a></li>
        <li><a href="#sec-posts">全貼文表現明細表</a></li>
        <li><a href="#sec-insights">受歡迎內容特徵歸納</a></li>
        <li><a href="#sec-comments">用戶留言洞察與建議</a></li>
        <li><a href="#sec-plan">未來活動策略規劃</a></li>
      </ol>
    </nav>`;
  }

  /**
   * 1. 頁首
   */
  generateHeader() {
    const { kpi } = this.data;
    return `
    <div class="report-header">
      <h1>${this.brandName}</h1>
      <div class="subtitle">社群成果分析報告 Social Media Performance Report</div>
      <div class="header-meta">
        <span>📅 ${this.startDate} ~ ${this.endDate}</span>
        <span>📊 分析 ${kpi.totalPosts} 篇貼文</span>
        <span>📈 報告年度 ${this.year}</span>
      </div>
    </div>`;
  }

  /**
   * 2. KPI 概覽
   */
  generateKPI() {
    const { kpi } = this.data;
    const cards = [
      { icon: '📝', label: '貼文發布總篇數', value: kpi.totalPosts, color: this.c.primary },
      { icon: '👥', label: '粉專追蹤人數', value: kpi.followersCount.toLocaleString(), color: this.c.secondary },
      { icon: '👁️', label: '累計總觸及人數', value: kpi.totalReach.toLocaleString(), color: this.c.primaryLight },
      { icon: '💬', label: '平均互動次數', value: kpi.avgEngagement.toLocaleString(), color: this.c.accent },
    ];

    return `
    <section id="sec-kpi" class="report-section" aria-labelledby="title-kpi">
    <div class="section-title" id="title-kpi"><span class="icon">📊</span> KPI 概覽</div>
    <div class="kpi-grid">
      ${cards.map(c => `
        <div class="kpi-card" style="border-color: ${c.color};">
          <div class="kpi-icon">${c.icon}</div>
          <div class="kpi-value" style="color: ${c.color};">${c.value}</div>
          <div class="kpi-label">${c.label}</div>
        </div>
      `).join('')}
    </div>
    </section>`;
  }

  /**
   * 3. 本期互動率最高貼文 Highlight
   */
  generateTopPostHighlight() {
    const post = this.data.topPost;
    if (!post) return '<p>本期無貼文數據</p>';

    const excerpt = post.message ? post.message.substring(0, 80) + (post.message.length > 80 ? '...' : '') : '（無文字內容）';
    const ratePercent = (post.engagementRate * 100).toFixed(2);

    return `
    <section id="sec-top" class="report-section" aria-labelledby="title-top">
    <div class="section-title" id="title-top"><span class="icon">🏆</span> 本期互動率最高貼文</div>
    <div class="highlight-card">
      <div class="highlight-title">📌 ${post.title}</div>
      <div class="highlight-excerpt">${this.escapeHtml(excerpt)}</div>
      <div class="highlight-stats">
        <div class="highlight-stat">
          <div class="stat-value">${post.reach.toLocaleString()}</div>
          <div class="stat-label">觸及人數</div>
        </div>
        <div class="highlight-stat">
          <div class="stat-value">${post.totalEngagement.toLocaleString()}</div>
          <div class="stat-label">互動次數</div>
        </div>
        <div class="highlight-stat">
          <div class="stat-value">${ratePercent}%</div>
          <div class="stat-label">互動率</div>
        </div>
        <div class="highlight-stat">
          <div class="stat-value">${post.mediaType}</div>
          <div class="stat-label">素材型式</div>
        </div>
      </div>
    </div>
    </section>`;
  }

  /**
   * 4. 內容表現分析（左右兩欄）
   */
  generateContentAnalysis() {
    const { topicAnalysis, mediaAnalysis, posts } = this.data;
    const maxEngagementRate = topicAnalysis.length > 0 ? topicAnalysis[0].engagementRate : 1;

    // 左欄：各主題互動率排名
    const leftPanel = `
      <div class="analysis-panel">
        <h3>📋 各主題互動率排名</h3>
        <table class="rank-table">
          <thead>
            <tr><th width="35">#</th><th>主題</th><th>互動率</th><th width="120">視覺化</th></tr>
          </thead>
          <tbody>
            ${topicAnalysis.slice(0, 10).map((t, i) => {
              const pct = maxEngagementRate > 0 ? (t.engagementRate / maxEngagementRate * 100) : 0;
              const ratePct = (t.engagementRate * 100).toFixed(2);
              const colors = this.c.colorsArr;
              const color = colors[i % colors.length];
              return `<tr>
                <td class="rank-num">${i + 1}</td>
                <td title="${this.escapeHtml(t.topic)}" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escapeHtml(t.topic.substring(0, 20))}</td>
                <td>${ratePct}%</td>
                <td><div class="progress-bar-wrapper"><div class="progress-bar" style="width:${pct}%;background:${color};">${ratePct}%</div></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    // 右欄：素材型式分析 + 數據洞察 + 發文數量長條圖
    const maxMediaReach = Math.max(...mediaAnalysis.map(m => m.avgReach), 1);
    const mediaColors = { '照片': this.c.primary, '影片': this.c.secondary, '相簿': this.c.accent, '連結': this.c.accent2, '文字': '#718096', '其他': '#A0AEC0' };

    const rightPanel = `
      <div class="analysis-panel">
        <h3>🎬 素材型式分析</h3>
        ${mediaAnalysis.map(m => {
          const pct = (m.avgReach / maxMediaReach * 100).toFixed(0);
          const ratePct = (m.engagementRate * 100).toFixed(2);
          const color = mediaColors[m.type] || '#718096';
          return `<div class="media-item">
            <span class="media-name">${m.type}</span>
            <div class="progress-bar-wrapper" style="flex:1;">
              <div class="progress-bar" style="width:${pct}%;background:${color};">${m.avgReach}</div>
            </div>
            <div class="media-stats">
              平均觸及 ${m.avgReach.toLocaleString()}<br>
              互動率 ${ratePct}%
            </div>
          </div>`;
        }).join('')}

        <div class="data-insight">
          <strong>📖 數據洞察：</strong>
          ${this.generateDataInsightText(mediaAnalysis, topicAnalysis)}
        </div>

        <div class="bar-chart">
          <h3 style="margin-bottom:16px;">📊 發文數量分佈</h3>
          ${mediaAnalysis.map(m => {
            const maxCount = Math.max(...mediaAnalysis.map(x => x.count), 1);
            const pct = (m.count / maxCount * 100).toFixed(0);
            const color = mediaColors[m.type] || '#718096';
            return `<div class="bar-item">
              <span class="bar-label">${m.type}</span>
              <div class="bar-container">
                <div class="bar-fill" style="width:${pct}%;background:${color};">${m.count} 篇</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    return `
    <section id="sec-content" class="report-section" aria-labelledby="title-content">
    <div class="section-title" id="title-content"><span class="icon">📈</span> 內容表現分析</div>
    <div class="analysis-grid">
      ${leftPanel}
      ${rightPanel}
    </div>
    </section>`;
  }

  /**
   * 生成數據洞察文字
   */
  generateDataInsightText(mediaAnalysis, topicAnalysis) {
    const bestMedia = mediaAnalysis[0];
    const bestTopic = topicAnalysis[0];
    const parts = [];

    if (bestMedia) {
      parts.push(`在素材表現方面，<strong>${bestMedia.type}</strong>型內容互動率最高（${(bestMedia.engagementRate * 100).toFixed(2)}%），平均觸及 ${bestMedia.avgReach.toLocaleString()} 人。`);
    }
    if (bestTopic) {
      parts.push(`主題分析顯示「${this.escapeHtml(bestTopic.topic.substring(0, 20))}」相關內容最受粉絲喜愛。`);
    }
    parts.push('建議下月可增加高互動型素材的發布比例，並延續受歡迎主題的內容方向。');

    let out = parts.join('');
    if (this.data.dataQuality?.disclaimers?.length) {
      out +=
        '<br><br><em style="color:#718096;font-size:0.92em;">※ 若本期觸及數據缺漏較多，請一併參考頁首「資料品質說明」解讀下列結論。</em>';
    }
    return out;
  }

  /**
   * 5. 全貼文表現明細表
   */
  generatePostTable() {
    const posts = [...this.data.posts].sort((a, b) => b.reach - a.reach);
    const maxRate = Math.max(...posts.map(p => p.engagementRate), 0.001);

    const badgeClass = {
      '照片': 'badge-photo', '影片': 'badge-video', '相簿': 'badge-album',
      '連結': 'badge-link', '文字': 'badge-text', '其他': 'badge-other',
    };

    const rateColors = [this.c.primary, this.c.primaryLight, this.c.accent, this.c.secondary];

    return `
    <section id="sec-posts" class="report-section" aria-labelledby="title-posts">
    <div class="section-title" id="title-posts"><span class="icon">📋</span> 全貼文表現明細表</div>
    <p class="scroll-hint">表格欄位較多時，可左右滑動以檢視完整內容。</p>
    <div class="post-table-wrapper">
      <table class="post-table">
        <thead>
          <tr>
            <th width="45">#</th>
            <th>貼文主題</th>
            <th width="70">素材</th>
            <th width="100">觸及人數</th>
            <th width="100">互動次數</th>
            <th width="160">互動率</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map((p, i) => {
            const ratePct = (p.engagementRate * 100).toFixed(2);
            const barPct = (p.engagementRate / maxRate * 100).toFixed(0);
            const color = rateColors[i % rateColors.length];
            const cls = badgeClass[p.mediaType] || 'badge-other';
            return `<tr>
              <td>${i + 1}</td>
              <td class="post-title-cell" title="${this.escapeHtml(p.title)}">${this.escapeHtml(p.title)}</td>
              <td><span class="badge ${cls}">${p.mediaType}</span></td>
              <td class="num-cell">${p.reach.toLocaleString()}</td>
              <td class="num-cell">${p.totalEngagement.toLocaleString()}</td>
              <td>
                <div class="mini-progress">
                  <div class="fill" style="width:${barPct}%;background:${color};">${ratePct}%</div>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    </section>`;
  }

  /**
   * 6. 受歡迎內容特徵歸納（2×2 Insight Cards）
   */
  generateInsightCards() {
    const { insights } = this.data;

    return `
    <section id="sec-insights" class="report-section" aria-labelledby="title-insights">
    <div class="section-title" id="title-insights"><span class="icon">💡</span> 受歡迎內容特徵歸納</div>
    <div class="insight-grid">
      ${insights.map(card => `
        <div class="insight-card" style="border-color: ${card.borderColor};">
          <div class="insight-emoji">${card.emoji}</div>
          <div class="insight-label">${card.label}</div>
          <div class="insight-title">${card.title}</div>
          <div class="insight-desc">${card.description}</div>
        </div>
      `).join('')}
    </div>
    </section>`;
  }

  /**
   * 8. 未來活動策略規劃（表格）
   */
  generateActivityPlan() {
    const { activityPlan } = this.data;

    return `
    <section id="sec-plan" class="report-section" aria-labelledby="title-plan">
    <div class="section-title" id="title-plan"><span class="icon">🗓</span> 未來活動策略規劃</div>
    <div class="activity-table-wrapper">
      <table class="activity-table">
        <thead>
          <tr>
            <th width="120">時機</th>
            <th>活動方向</th>
            <th width="160">素材建議</th>
            <th>預期效益</th>
          </tr>
        </thead>
        <tbody>
          ${activityPlan.map(row => `
            <tr>
              <td><span class="timing-badge">${row.timing}</span></td>
              <td>${row.direction}</td>
              <td>${row.material}</td>
              <td>${row.benefit}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    </section>`;
  }

  /**
   * 8.5 用戶留言洞察與貼文建議
   */
  generateCommentInsights() {
    const isEcoco = this.brandName.toLowerCase().includes('ecoco') || this.brandName.toLowerCase().includes('eco');
    if (isEcoco) {
      return `
      <section id="sec-comments" class="report-section" aria-labelledby="title-comments">
      <div class="section-title" id="title-comments"><span class="icon">💬</span> 本月用戶留言洞察與建議</div>
      <div class="comment-insight-wrapper">
        <p style="font-size: 0.95em; color: #4a5568; margin-bottom: 8px;">根據系統最新抓取的 ECOCO 粉絲留言，為您整理出以下四大反饋與對應的社群貼文規劃建議：</p>
        <div class="comment-grid">
          <div class="comment-box" style="border-left-color: ${this.c.secondary};">
            <h4>📍 痛點一：機台滿桶或故障狀態</h4>
            <p>不少粉絲反映抵達現場才發現滿桶：「跑到現場才發現機台滿了」、「何時會來清空呢？」。</p>
            <div class="action">💡 建議貼文：發布【出發前必看！APP 尋找機台與即時空桶狀態教學圖卡】。</div>
          </div>
          <div class="comment-box" style="border-left-color: ${this.c.orangeAlert};">
            <h4>♻️ 痛點二：回收物規格辨識疑問</h4>
            <p>粉絲對於能否回收特定品項有疑慮：「這個杯子可以投嗎？」、「廢電池能混著投嗎？」。</p>
            <div class="action">💡 建議貼文：製作【環保小百科：機台吃什麼？輕鬆辨識回收材質指南】。</div>
          </div>
          <div class="comment-box" style="border-left-color: ${this.c.accent};">
            <h4>🎁 痛點三：APP 點數折抵與活動</h4>
            <p>用戶對於點數兌換與快閃活動充滿期待與疑問：「點數可以換什麼最划算？」、「序號在哪裡輸入？」。</p>
            <div class="action">💡 建議貼文：推出【點數放大術：本月精選合作店家與超值兌換密技】。</div>
          </div>
          <div class="comment-box" style="border-left-color: ${this.c.primary};">
            <h4>🌟 亮點四：家庭與校園的環保實踐</h4>
            <p>許多家長分享帶孩子一起做環保的樂趣：「小孩每天指定要去餵猴子」、「蒐集電池變全家運動」。</p>
            <div class="action">💡 建議貼文：募集並精選【ECOCO 小小環保英雄】粉絲圖文，帶動社區參與。</div>
          </div>
        </div>
      </div>
      </section>`;
    }
    return `
    <section id="sec-comments" class="report-section" aria-labelledby="title-comments">
    <div class="section-title" id="title-comments"><span class="icon">💬</span> 本月用戶留言洞察與建議</div>
    <div class="comment-insight-wrapper">
      <p style="font-size: 0.95em; color: #4a5568; margin-bottom: 8px;">根據系統最新抓取的粉絲留言，為您整理出以下四大痛點與對應的社群貼文規劃建議：</p>
      <div class="comment-grid">
        <div class="comment-box" style="border-left-color: ${this.c.secondary};">
          <h4>📍 痛點一：尋找機台與特定洗劑</h4>
          <p>近 30% 留言在詢問特定機台（如洗碗精、防蟎款）。粉絲反應：「屏東缺洗碗精補充機」、「高雄找不到」。</p>
          <div class="action">💡 建議貼文：發布【隱藏版攻略：全台洗碗精機台地圖】與【擴點許願池】互動貼文。</div>
        </div>
        <div class="comment-box" style="border-left-color: ${this.c.orangeAlert};">
          <h4>💳 痛點二：操作與客服問題</h4>
          <p>部分粉絲對付款與發票流程有疑慮，例如：「找不到Line Pay條碼」、「補開發票要身分證太麻煩」。</p>
          <div class="action">💡 建議貼文：製作【機台操作不卡關！發票與統編攻略指南】教學圖卡。</div>
        </div>
        <div class="comment-box" style="border-left-color: ${this.c.accent};">
          <h4>🧴 痛點三：產品教育與用量疑惑</h4>
          <p>有些新用戶不知道如何使用：「不知道洗衣服要放多少洗衣精」、「機器上沒有寫成分」。</p>
          <div class="action">💡 建議貼文：推出【洗衣小學堂：到底要按多少？】用量教學與成分大解密。</div>
        </div>
        <div class="comment-box" style="border-left-color: ${this.c.primary};">
          <h4>🌟 亮點四：滿滿的好口碑 (UGC)</h4>
          <p>大量的「#小小永續英雄」標籤湧現，許多家長分享帶孩子體驗的感動：「從幼稚園裝到四年級」。</p>
          <div class="action">💡 建議貼文：精選網友圖文發布【謝謝你們陪地球一起長大】，帶動情感共鳴。</div>
        </div>
      </div>
    </div>
    </section>`;
  }

  /**
   * 9. 頁尾
   */
  generateFooter() {
    const { kpi } = this.data;
    return `
    <div class="report-footer">
      <div class="footer-brand">${this.brandName}</div>
      <div class="footer-stats">
        <span>📊 分析 ${kpi.totalPosts} 篇貼文</span>
        <span>👁️ 總觸及 ${kpi.totalReach.toLocaleString()} 人</span>
        <span>👥 追蹤 ${kpi.followersCount.toLocaleString()} 人</span>
      </div>
      <div class="footer-note">
        報告生成時間：${new Date().toLocaleString('zh-TW')}
      </div>
    </div>`;
  }

  /**
   * HTML 跳脫
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = ReportGenerator;
