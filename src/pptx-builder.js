const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const path = require("path");

class PptxBuilder {
  constructor(templatePath) {
    this.templatePath = templatePath;
  }

  generate(data, outputPath) {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`找不到簡報公版模板：${this.templatePath}。請確認根目錄有該檔案。`);
    }

    // 讀取模板檔案 (binary)
    const content = fs.readFileSync(this.templatePath, "binary");
    const zip = new PizZip(content);

    // 建立 docxtemplater，關閉段落循環警告
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 準備要替換的變數 (Flatten data for PPTX)
    const viewData = {
      brandName: data.pageInfo?.name || '品牌名稱',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      totalPosts: data.kpi?.totalPosts || 0,
      totalReach: (data.kpi?.totalReach || 0).toLocaleString(),
      avgEngagement: data.kpi?.avgEngagement || '0',
    };

    // 執行變數替換
    doc.render(viewData);

    // 產出新檔案
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // 寫入硬碟輸出
    fs.writeFileSync(outputPath, buf);
    return outputPath;
  }
}

module.exports = PptxBuilder;
