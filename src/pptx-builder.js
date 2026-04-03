const PptxGenJS = require("pptxgenjs");

class PptxBuilder {
  constructor(templatePath) {
    // 捨棄原本 docxtemplater 的 template 讀取，改採完全從無到有繪製
    // 為了相容原本 server.js 呼叫，保留建構子簽名
  }

  async generate(data, outputPath) {
    let pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches

    // 色彩常數定義
    const COLOR_PRIMARY = "060E9F";     // 深藍
    const COLOR_SECONDARY = "FF5000";   // 橘色
    const COLOR_TEXT = "333333";
    const COLOR_BG_LIGHT = "F3F4F6";

    // 共用頁首/頁尾設定
    pres.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: "FFFFFF" },
      margin: [0.5, 0.5, 0.5, 0.5],
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: COLOR_PRIMARY } } },
        { text: { text: "Report Engine | Social Data Analysis", options: { x: 0.5, y: 5.2, w: 4, h: 0.3, fontSize: 10, color: "888888" } } },
      ]
    });

    // 格式化資料
    const brandName = data.brandName || data.pageInfo?.name || '品牌名稱';
    const startDate = data.startDate || '';
    const endDate = data.endDate || '';
    const kpi = data.kpi || {};
    const topPost = data.topPost || {};

    // ----------------------------------------------------------------------
    // Slide 1: 封面 (深藍漸層＋裝飾圓形，含品牌名、月份、製作人欄位)
    // ----------------------------------------------------------------------
    let slide1 = pres.addSlide();
    slide1.background = { fill: { type: 'solid', color: COLOR_PRIMARY } };
    
    // 裝飾圓形
    slide1.addShape(pres.ShapeType.ellipse, { x: -1, y: 2.5, w: 5, h: 5, fill: { color: "FFFFFF", transparency: 90 } });
    slide1.addShape(pres.ShapeType.ellipse, { x: 6, y: -2, w: 6, h: 6, fill: { color: "FFFFFF", transparency: 90 } });
    
    slide1.addText(`${brandName} 社群數據回顧`, { x: 1, y: 1.8, w: 8, h: 1, fontSize: 44, bold: true, color: "FFFFFF" });
    slide1.addText(`${startDate} ~ ${endDate}`, { x: 1, y: 2.8, w: 8, h: 0.5, fontSize: 24, fontFace: "Arial", color: "FFEB3B" });
    
    const today = new Date().toLocaleDateString('zh-TW');
    slide1.addText(`製作部門 / 製作人：________________    製作日期：${today}`, { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 14, color: "FFFFFF", transparency: 20 });
    slide1.addShape(pres.ShapeType.line, { x: 1, y: 4.3, w: 8, h: 0, line: { color: "FFFFFF", width: 1, transparency: 50 } });

    // ----------------------------------------------------------------------
    // Slide 2: 整體數據概覽 (4 格 KPI 卡片＋本期最高互動貼文 Highlight)
    // ----------------------------------------------------------------------
    let slide2 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide2.addText("整體數據概覽", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 28, bold: true, color: COLOR_PRIMARY });
    
    // 4 KPI Cards
    const kpiData = [
      { label: "總貼文篇數", val: `${kpi.totalPosts || 0} 篇` },
      { label: "總觸及人數", val: `${(kpi.totalReach || 0).toLocaleString()}` },
      { label: "總互動次數", val: `${(kpi.totalEngagement || 0).toLocaleString()}` },
      { label: "平均互動次數", val: `${kpi.avgEngagement || 0} / 篇` }
    ];
    kpiData.forEach((item, idx) => {
      const cx = 0.5 + (idx * 2.2);
      slide2.addShape(pres.ShapeType.roundRect, { x: cx, y: 1.2, w: 2, h: 1.2, fill: { color: COLOR_BG_LIGHT }, rectRadius: 0.1 });
      slide2.addText(item.label, { x: cx, y: 1.3, w: 2, h: 0.3, fontSize: 14, color: "666666", align: 'center' });
      slide2.addText(item.val, { x: cx, y: 1.7, w: 2, h: 0.5, fontSize: 22, bold: true, color: COLOR_PRIMARY, align: 'center' });
    });

    // Top Post
    slide2.addText("🏆 本期最高互動貼文Highlight", { x: 0.5, y: 2.8, w: 9, h: 0.5, fontSize: 18, bold: true, color: COLOR_SECONDARY });
    let topPostMsg = topPost.message ? topPost.message.substring(0, 150) + "..." : "無文字內容";
    slide2.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 3.4, w: 9, h: 1.4, fill: { color: "FFF5EB" }, line: { color: COLOR_SECONDARY, width: 1 }, rectRadius: 0.1 });
    slide2.addText(`貼文內容：${topPostMsg}`, { x: 0.7, y: 3.5, w: 8.6, h: 0.6, fontSize: 13, color: COLOR_TEXT, valign: 'top' });
    
    let rate = topPost.reach && topPost.reach > 0 ? ((topPost.engagement / topPost.reach) * 100).toFixed(2) : '0';
    let statTxt = `🔹 類型：${topPost.format || '照片'}    🔹 觸及：${(topPost.reach || 0).toLocaleString()}    🔹 互動：${(topPost.engagement || 0).toLocaleString()}    🔹 互動率：${rate}%`;
    slide2.addText(statTxt, { x: 0.7, y: 4.3, w: 8.6, h: 0.3, fontSize: 14, bold: true, color: COLOR_PRIMARY });

    // ----------------------------------------------------------------------
    // Slide 3: 各主題互動率排名 (進度條排名表)
    // ----------------------------------------------------------------------
    let slide3 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide3.addText("各主題互動表現排名", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 28, bold: true, color: COLOR_PRIMARY });

    let rowsTop = [];
    rowsTop.push([{ text: "排名", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "主題名稱", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "平均觸及", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "互動率表現", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);
    
    let topics = data.topicAnalysis || [];
    // 找最大值來畫占比(此處簡化成直接列出)
    topics.slice(0, 6).forEach((t, i) => {
      rowsTop.push([
        { text: `${i + 1}`, options: { align: 'center' } },
        { text: t.topic },
        { text: t.avgReach.toLocaleString(), options: { align: 'center' } },
        { text: `${t.engagementRate} (${t.avgEngagement}次)`, options: { align: 'center' } }
      ]);
    });
    
    if (rowsTop.length > 1) {
      slide3.addTable(rowsTop, { x: 0.5, y: 1.5, w: 9, colW: [1, 4, 1.5, 2.5], border: { type: 'solid', color: 'DDDDDD' }, fontSize: 14, rowH: 0.4, valign: 'middle' });
    } else {
      slide3.addText("無足夠的主題分析資料", { x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 16, color: "888888" });
    }

    // ----------------------------------------------------------------------
    // Slide 4: 素材型式分析 (左欄表格、右欄洞察)
    // ----------------------------------------------------------------------
    let slide4 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide4.addText("素材型式分析", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 28, bold: true, color: COLOR_PRIMARY });

    // Left Table
    let rowsFmt = [];
    rowsFmt.push([{ text: "素材型式", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "平均觸及", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "互動率", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);
    
    let formats = data.mediaAnalysis || [];
    formats.forEach(f => {
      rowsFmt.push([
        { text: f.type },
        { text: f.averageReach.toLocaleString(), options: { align: 'center' } },
        { text: f.engagementRate, options: { align: 'center' } }
      ]);
    });
    if (rowsFmt.length > 1) {
      slide4.addTable(rowsFmt, { x: 0.5, y: 1.3, w: 4.5, colW: [1.5, 1.5, 1.5], border: { type: 'solid', color: 'DDDDDD' }, fontSize: 13, rowH: 0.4, valign: 'middle' });
    }

    // Right Insight
    slide4.addShape(pres.ShapeType.roundRect, { x: 5.5, y: 1.3, w: 4, h: 3, fill: { color: "F8F9FA" }, line: { color: "E2E8F0" }, rectRadius: 0.1 });
    slide4.addText("📌 分析洞察", { x: 5.7, y: 1.5, w: 3.6, h: 0.4, fontSize: 18, bold: true, color: COLOR_SECONDARY });
    slide4.addText("不同型式的素材會吸引不同受眾。\n- 相片（Photos）通常能帶來較廣泛的觸及。\n- 短影音（Videos）目前在社群上擁有最佳演算法紅利。\n- 請依據這月份最高互動的型式做為下個月的核心推廣型式。", { x: 5.7, y: 2.0, w: 3.6, h: 2, fontSize: 14, color: COLOR_TEXT, valign: 'top' });

    // ----------------------------------------------------------------------
    // Slide 5: 全貼文表現明細 (7 列可擴充)
    // ----------------------------------------------------------------------
    let slide5 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide5.addText("全貼文表現明細", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 28, bold: true, color: COLOR_PRIMARY });

    let rowsAll = [];
    rowsAll.push([{ text: "#", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "內容摘要", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "分類", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "型式", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "觸及", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "互動", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "互動率", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);

    const posts = data.posts || [];
    posts.slice(0, 7).forEach((p, i) => { // 取前7名
      let shortMsg = p.message ? p.message.substring(0, 15) + "..." : "無";
      let prate = p.reach ? ((p.engagement / p.reach) * 100).toFixed(2) + "%" : "0%";
      rowsAll.push([
        { text: `${i + 1}`, options: { align: 'center' } },
        { text: shortMsg },
        { text: p.topic || '未知' },
        { text: p.format || '照片' },
        { text: (p.reach || 0).toLocaleString(), options: { align: 'right' } },
        { text: (p.engagement || 0).toLocaleString(), options: { align: 'right' } },
        { text: prate, options: { align: 'right', color: COLOR_SECONDARY, bold: true } }
      ]);
    });

    if (rowsAll.length > 1) {
      slide5.addTable(rowsAll, { x: 0.5, y: 1.3, w: 9, colW: [0.5, 3.5, 1.2, 0.8, 1, 1, 1], border: { type: 'solid', color: 'DDDDDD' }, fontSize: 12, rowH: 0.35, valign: 'middle' });
    } else {
      slide5.addText("無貼文資料", { x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 16 });
    }

    // ----------------------------------------------------------------------
    // Slide 6: 優化方向建議 (3 欄策略卡片)
    // ----------------------------------------------------------------------
    let slide6 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide6.addText("未來優化方向建議", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 28, bold: true, color: COLOR_PRIMARY });

    let insights = data.insights || {};
    const insightCards = [
      { num: "01", title: "內容結構與切入", text: insights.structure || '持續測試不同長短文案比例' },
      { num: "02", title: "敘事與共鳴設計", text: insights.narrative || '多從受眾痛點出發' },
      { num: "03", title: "互動誘導設計", text: insights.cta || '加入更明確的CTA(如:留言+1)' }
    ];

    insightCards.forEach((c, idx) => {
      let cx = 0.5 + (idx * 3.1);
      slide6.addShape(pres.ShapeType.roundRect, { x: cx, y: 1.5, w: 2.8, h: 3, fill: { color: "F8F9FA" }, line: { color: "060E9F", width: 2 }, rectRadius: 0.1 });
      slide6.addText(c.num, { x: cx, y: 1.6, w: 2.8, h: 0.6, fontSize: 36, bold: true, fontFace: "Impact", color: "E2E8F0", align: 'right' });
      slide6.addText(c.title, { x: cx + 0.2, y: 1.9, w: 2.4, h: 0.4, fontSize: 18, bold: true, color: COLOR_PRIMARY });
      slide6.addText(c.text, { x: cx + 0.2, y: 2.4, w: 2.4, h: 1.8, fontSize: 13, color: "444444", valign: 'top' });
    });

    // ----------------------------------------------------------------------
    // Slide 7: 未來活動策略規劃 (4 欄表格)
    // ----------------------------------------------------------------------
    let slide7 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide7.addText("未來活動策略佈局", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 28, bold: true, color: COLOR_PRIMARY });

    let rowsPlan = [];
    rowsPlan.push([{ text: "時機點", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                   { text: "活動方向", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                   { text: "素材建議", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                   { text: "品牌生態連結", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);
    
    let plans = data.activityPlan || [];
    plans.slice(0, 4).forEach((plan) => {
       rowsPlan.push([
         { text: plan.month || '' },
         { text: plan.direction || '' },
         { text: plan.format || '' },
         { text: plan.ecocoLink || plan.link || '' }
       ]);
    });
    
    // 如果沒有 plan 塞入假語料避免出錯
    if(rowsPlan.length === 1) {
       rowsPlan.push(["下個月", "環保產品推廣", "短影音", "結合回收點數"]);
       rowsPlan.push(["下兩個月", "會員招募", "知識圖卡", "強調永續循環生活"]);
    }

    slide7.addTable(rowsPlan, { x: 0.5, y: 1.3, w: 9, colW: [1.5, 3, 1.5, 3], border: { type: 'solid', color: 'DDDDDD' }, fontSize: 13, rowH: 0.6, valign: 'middle' });

    // Output file
    await pres.writeFile({ fileName: outputPath });
    return outputPath;
  }
}

module.exports = PptxBuilder;
