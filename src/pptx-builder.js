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
    // 色彩與品牌邏輯 (根據品牌名稱切換)
    const brandName = data.brandName || data.pageInfo?.name || '品牌名稱';
    const isEcoco = brandName.toLowerCase().includes('ecoco') || brandName.toLowerCase().includes('eco');
    
    // 定義品牌色系 (PptxGenJS 用 RRGGBB 無 #)
    const COLOR_PRIMARY = isEcoco ? "060E9F" : "0057B7";     // 深藍
    const COLOR_SECONDARY = isEcoco ? "FF5000" : "FFA000";   // 橘色/琥珀色
    const COLOR_ACCENT = isEcoco ? "FFCE00" : "5CBEB2";      // 黃色/青色
    const COLOR_TEXT = "333333";
    const COLOR_TEXT_LIGHT = "777777";
    const COLOR_BG_PAPER = "F4F4F4"; // 參考圖的淺灰底色
    const COLOR_BG_WHITE = "FFFFFF";

    // 共用頁首/頁尾設定
    pres.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { fill: COLOR_BG_WHITE },
      margin: [0.5, 0.5, 0.5, 0.5],
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.1, fill: COLOR_PRIMARY } },
        { text: { text: `${brandName} Social Analytics`, options: { x: 0.5, y: 5.2, w: 4, h: 0.3, fontSize: 10, color: "888888", fontFace: "Arial" } } },
      ]
    });

    const startDate = data.startDate || '';
    const endDate = data.endDate || '';
    const kpi = data.kpi || {};
    const topPost = data.topPost || {};

    // ----------------------------------------------------------------------
    // Slide 1: 封面 (參照 UI 簡約風格重新製作)
    // ----------------------------------------------------------------------
    let slide1 = pres.addSlide();
    slide1.background = { fill: COLOR_BG_PAPER };
    
    // 1. 左側垂直分隔線
    slide1.addShape(pres.ShapeType.line, { 
      x: 3.2, y: 0.5, w: 0, h: 4.6, 
      line: { color: "CCCCCC", width: 1 } 
    });
    
    // 2. 裝飾性幾何圖形 (疊合圓圈) - 放置在分隔線上
    const circleSize = 0.45;
    const circleX = 3.2 - (circleSize / 2);
    slide1.addShape(pres.ShapeType.ellipse, { x: circleX, y: 0.8, w: circleSize, h: circleSize, line: { color: "666666", width: 1 } });
    slide1.addShape(pres.ShapeType.ellipse, { x: circleX, y: 0.95, w: circleSize, h: circleSize, line: { color: "999999", width: 1 } });
    slide1.addShape(pres.ShapeType.ellipse, { x: circleX, y: 1.1, w: circleSize, h: circleSize, line: { color: "CCCCCC", width: 1 } });
    
    // 3. 左側文字 (品牌與報告類型)
    slide1.addText(brandName.toUpperCase(), { 
      x: 0.5, y: 0.8, w: 2.5, h: 0.4, 
      fontSize: 14, fontFace: "Arial", color: COLOR_TEXT, bold: false, align: 'right' 
    });
    slide1.addText("MONTHLY PERFORMANCE\nREPORT", { 
      x: 0.5, y: 4.4, w: 2.5, h: 0.6, 
      fontSize: 10, fontFace: "Arial", color: COLOR_TEXT_LIGHT, align: 'right', lineSpacing: 12 
    });
    
    // 4. 右側文字 (主標題)
    const displayMonth = startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() : 'REPORT DATA';
    
    slide1.addText("SOCIAL MEDIA\nMARKETING\nREPORT", { 
      x: 3.6, y: 1.5, w: 6, h: 2.5, 
      fontSize: 48, fontFace: "Arial Black", color: COLOR_PRIMARY, bold: true, lineSpacing: 45 
    });
    
    slide1.addText(brandName, { 
      x: 3.6, y: 4.1, w: 5, h: 0.4, 
      fontSize: 22, fontFace: "Arial", color: COLOR_TEXT, bold: false 
    });
    
    // 5. 右上與右下資訊
    slide1.addText(displayMonth, { 
      x: 7.5, y: 0.8, w: 2, h: 0.4, 
      fontSize: 12, fontFace: "Arial", color: COLOR_TEXT_LIGHT, align: 'right' 
    });
    
    slide1.addText("PAGE 1", { 
      x: 7.5, y: 4.6, w: 2, h: 0.4, 
      fontSize: 12, fontFace: "Arial", color: COLOR_TEXT_LIGHT, align: 'right' 
    });

    // 6. 最右側垂直文字
    slide1.addText("PREPARED FOR " + brandName.toUpperCase(), { 
      x: 8.8, y: 2.5, w: 2.0, h: 0.3, 
      fontSize: 9, fontFace: "Arial", color: "BBBBBB", align: 'right', rotate: 270 
    });
    
    // ----------------------------------------------------------------------
    // Slide 2: 整體數據概覽 (4 格 KPI 卡片＋本期最高互動貼文 Highlight)
    // ----------------------------------------------------------------------
    let slide2 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide2.addText("整體數據概覽 Overall Performance", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    
    // 4 KPI Cards
    const kpiData = [
      { label: "總貼文篇數", val: `${kpi.totalPosts || 0} 篇`, color: COLOR_PRIMARY },
      { label: "總觸及人數", val: (kpi.totalReach || 0).toLocaleString(), color: COLOR_SECONDARY },
      { label: "平均互動次數", val: (kpi.avgEngagement || 0).toLocaleString(), color: COLOR_ACCENT },
      { label: "整體互動率", val: `${((kpi.overallEngagementRate || 0) * 100).toFixed(2)}%`, color: COLOR_PRIMARY }
    ];
    
    const cardW = 2.1;
    const cardGap = 0.2;
    const startX = 0.5;

    kpiData.forEach((item, idx) => {
      const cx = startX + (idx * (cardW + cardGap));
      // Card Background
      slide2.addShape(pres.ShapeType.roundRect, { x: cx, y: 1.1, w: cardW, h: 1.2, fill: COLOR_BG_WHITE, rectRadius: 0.1, line: {color: "E2E8F0", width: 1} });
      // Label
      slide2.addText(item.label, { x: cx, y: 1.2, w: cardW, h: 0.3, fontSize: 11, color: "666666", align: 'center', fontFace: 'Arial' });
      // Value
      slide2.addText(item.val, { x: cx, y: 1.5, w: cardW, h: 0.6, fontSize: 24, bold: true, color: item.color, align: 'center', fontFace: 'Arial' });
    });

    // Top Post Highlight
    slide2.addText("🏆 本期互動之星", { x: 0.5, y: 2.7, w: 9, h: 0.5, fontSize: 18, bold: true, color: COLOR_PRIMARY });
    
    // Highlight Container (稍微加高到 1.9，底部留白縮減)
    slide2.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 3.2, w: 9, h: 1.9, fill: isEcoco ? "F0F4FF" : "F0F7FF", line: { color: COLOR_PRIMARY, width: 1 }, rectRadius: 0.1 });
    
    // Top Post Content (利用 shrinkText 自動縮小字級，並增大文字框高度)
    let topPostMsg = topPost.message ? topPost.message : "尚無文字內容";
    // 預先過濾過多換行，避免空行佔用空間
    topPostMsg = topPostMsg.replace(/\n\s*\n/g, '\n').substring(0, 400); 

    slide2.addText(topPostMsg, { 
      x: 0.8, y: 3.3, w: 8.4, h: 1.3, 
      fontSize: 12, color: COLOR_TEXT, valign: 'top', fontFace: 'Arial',
      shrinkText: true // 關鍵：文字過多時自動縮小字級
    });
    
    // Stats Bar (位置微調下移)
    let rate = topPost.reach && topPost.reach > 0 ? ((topPost.totalEngagement / topPost.reach) * 100).toFixed(2) : '0';
    let statTxt = [
        { text: "素材型式：", options: { color: "666666" } },
        { text: (topPost.mediaType || "照片") + "   ", options: { bold: true, color: COLOR_PRIMARY } },
        { text: "觸及人數：", options: { color: "666666" } },
        { text: (topPost.reach || 0).toLocaleString() + "   ", options: { bold: true, color: COLOR_PRIMARY } },
        { text: "互動率：", options: { color: "666666" } },
        { text: rate + "%", options: { bold: true, color: COLOR_SECONDARY } }
    ];
    
    slide2.addText(statTxt, { x: 0.8, y: 4.65, w: 8.4, h: 0.4, fontSize: 13, align: 'left', fontFace: 'Arial' });

    // ----------------------------------------------------------------------
    // Slide 3: 各主題互動率排名
    // ----------------------------------------------------------------------
    let slide3 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide3.addText("主題內容表現分析", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY });

    let rowsTop = [];
    rowsTop.push([{ text: "排名", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "主題分類 (Topic)", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "平均觸及", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "互動率表現", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);
    
    let topics = data.topicAnalysis || [];
    topics.slice(0, 7).forEach((t, i) => {
      rowsTop.push([
        { text: `${i + 1}`, options: { align: 'center' } },
        { text: t.topic },
        { text: (t.avgReach || 0).toLocaleString(), options: { align: 'center' } },
        { text: `${(t.engagementRate * 100).toFixed(2)}%`, options: { align: 'center', color: COLOR_SECONDARY, bold: true } }
      ]);
    });
    
    if (rowsTop.length > 1) {
      slide3.addTable(rowsTop, { x: 0.5, y: 1.3, w: 9, colW: [0.8, 4.2, 2, 2], border: { type: 'solid', color: 'EEEEEE' }, fontSize: 13, rowH: 0.45, valign: 'middle' });
    }

    // ----------------------------------------------------------------------
    // Slide 4: 素材型式與洞察
    // ----------------------------------------------------------------------
    let slide4 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide4.addText("素材型式效能分析", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY });

    let rowsFmt = [];
    rowsFmt.push([{ text: "素材型式", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "篇數", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "平均觸及", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "平均互動率", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);
    
    let formats = data.mediaAnalysis || [];
    formats.forEach(f => {
      rowsFmt.push([
        { text: f.type },
        { text: `${f.count || 0}`, options: { align: 'center' } },
        { text: (f.avgReach || 0).toLocaleString(), options: { align: 'center' } },
        { text: (f.engagementRate * 100).toFixed(2) + "%", options: { align: 'center', fontFace: 'Arial Bold', color: COLOR_SECONDARY } }
      ]);
    });
    if (rowsFmt.length > 1) {
      slide4.addTable(rowsFmt, { x: 0.5, y: 1.2, w: 5.5, colW: [1.5, 0.8, 1.5, 1.7], border: { type: 'solid', color: 'EEEEEE' }, fontSize: 12, rowH: 0.45, valign: 'middle' });
    }

    // Insight Card
    slide4.addShape(pres.ShapeType.roundRect, { x: 6.3, y: 1.2, w: 3.2, h: 3.5, fill: "F9FAFB", line: { color: "CBD5E1", width: 1 }, rectRadius: 0.1 });
    slide4.addText("📌 數據洞察點分析", { x: 6.5, y: 1.4, w: 2.8, h: 0.4, fontSize: 16, bold: true, color: COLOR_PRIMARY });
    
    let insightTxt = "1. 當月表現最佳素材為：" + (formats[0]?.type || "照片") + "\n\n2. 建議下月增加相關內容比例，以維持穩定的觸及表現。\n\n3. 如果長影音互動率較高，建議強化影片腳本的開頭鉤子。";
    slide4.addText(insightTxt, { x: 6.5, y: 1.9, w: 2.8, h: 2.5, fontSize: 12, color: COLOR_TEXT, valign: 'top', lineSpacing: 18 });

    // ----------------------------------------------------------------------
    // Slide 5: 全貼文表現明細 (精選前 8 名)
    // ----------------------------------------------------------------------
    let slide5 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide5.addText("全貼文表現明細 (Top High Engagement)", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY });

    let rowsAll = [];
    rowsAll.push([{ text: "#", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "內容摘要", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "分類", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "觸及", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "互動", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                  { text: "互動率", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);

    const posts = data.posts || [];
    posts.slice(0, 8).forEach((p, i) => {
      let shortMsg = p.message ? p.message.substring(0, 20).replace(/\n/g, ' ') + "..." : "無文字";
      let prate = p.reach ? ((p.totalEngagement / p.reach) * 100).toFixed(2) + "%" : "0%";
      rowsAll.push([
        { text: `${i + 1}`, options: { align: 'center' } },
        { text: shortMsg },
        { text: p.title || '一般' },
        { text: (p.reach || 0).toLocaleString(), options: { align: 'right' } },
        { text: (p.totalEngagement || 0).toLocaleString(), options: { align: 'right' } },
        { text: prate, options: { align: 'right', color: COLOR_SECONDARY, bold: true } }
      ]);
    });

    if (rowsAll.length > 1) {
      slide5.addTable(rowsAll, { x: 0.5, y: 1.2, w: 9, colW: [0.5, 4.0, 1.2, 1.1, 1.1, 1.1], border: { type: 'solid', color: 'EEEEEE' }, fontSize: 11, rowH: 0.38, valign: 'middle' });
    }

    // ----------------------------------------------------------------------
    // Slide 6: 未來優化方向建議
    // ----------------------------------------------------------------------
    let slide6 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide6.addText("未來優化方向建議", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY });

    let rawInsights = data.insights || [];
    const insightCards = rawInsights.slice(0, 3).length > 0 ? rawInsights.slice(0, 3) : [
        { label: '內容策略', description: '強化品牌與消費者的情感連結。' },
        { label: '發文時間', description: '觀測受眾最活躍時間段進行發布。' },
        { label: '互動引導', description: '在貼文末尾加入具體的 Call-to-Action。' }
    ];

    insightCards.forEach((c, idx) => {
      let cx = 0.5 + (idx * 3.1);
      // Card Main
      slide6.addShape(pres.ShapeType.roundRect, { x: cx, y: 1.5, w: 2.8, h: 3, fill: COLOR_BG_WHITE, line: { color: COLOR_PRIMARY, width: 2 }, rectRadius: 0.1 });
      slide6.addText(`0${idx + 1}`, { x: cx + 1.8, y: 1.6, w: 0.8, h: 0.6, fontSize: 32, bold: true, fontFace: "Impact", color: "F1F5F9", align: 'right' });
      slide6.addText(c.label || c.title, { x: cx + 0.2, y: 1.9, w: 2.4, h: 0.4, fontSize: 18, bold: true, color: COLOR_PRIMARY });
      slide6.addText(c.description, { x: cx + 0.2, y: 2.4, w: 2.4, h: 1.8, fontSize: 13, color: COLOR_TEXT, valign: 'top', lineSpacing: 20 });
    });

    // ----------------------------------------------------------------------
    // Slide 7: 未來活動策略佈局
    // ----------------------------------------------------------------------
    let slide7 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide7.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: isEcoco ? 'F8FAFF' : 'F7F9FF' }); // 特殊背景色
    slide7.addText("未來活動策略佈局", { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY });

    let rowsPlan = [];
    rowsPlan.push([{ text: "時機點 (Timing)", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                   { text: "活動方向 (Direction)", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                   { text: "素材建議 (Material)", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
                   { text: "預期品牌效益", options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }]);
    
    let plans = data.activityPlan || [];
    plans.slice(0, 4).forEach((plan) => {
       rowsPlan.push([
         { text: plan.timing || '' },
         { text: plan.direction || '' },
         { text: plan.material || '' },
         { text: plan.benefit || '' }
       ]);
    });
    
    if(rowsPlan.length === 1) {
       rowsPlan.push(["次月第一週", "節慶促銷方案推廣", "沉浸式短影音", "提升官網轉單率"]);
       rowsPlan.push(["次月第三週", "品牌核心價值傳遞", "系列知識圖卡", "強化品牌專業形象"]);
    }

    slide7.addTable(rowsPlan, { x: 0.5, y: 1.3, w: 9, colW: [1.5, 3, 1.5, 3], border: { type: 'solid', color: "CCCCCC" }, fontSize: 13, rowH: 0.7, valign: 'middle' });

    // Output file
    await pres.writeFile({ fileName: outputPath });
    return outputPath;
  }
}

module.exports = PptxBuilder;
