const fs = require('fs/promises');
const path = require('path');

const isVercel = process.env.VERCEL === '1';
const isBlobEnabled = isVercel && Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
);

async function saveArtifact(outputDir, name, content, contentType) {
  if (isVercel && !isBlobEnabled) {
    throw new Error('Vercel Blob 尚未連結，無法持續保存報告與分析快取。');
  }
  if (isBlobEnabled) {
    const { put } = require('@vercel/blob');
    const blob = await put(`artifacts/${name}`, content, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return blob.url;
  }

  const filePath = path.join(outputDir, name);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, content);
  return `/output/${encodeURIComponent(name)}`;
}

async function readArtifact(outputDir, name) {
  if (isBlobEnabled) {
    const { list } = require('@vercel/blob');
    const result = await list({ prefix: `artifacts/${name}`, limit: 1000 });
    const blob = result.blobs.find(item => item.pathname === `artifacts/${name}`);
    if (!blob) return null;
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }

  try {
    return await fs.readFile(path.join(outputDir, name));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function listArtifacts(outputDir) {
  if (isBlobEnabled) {
    const { list } = require('@vercel/blob');
    const result = await list({ prefix: 'artifacts/', limit: 1000 });
    return result.blobs.map(blob => ({
      name: blob.pathname.slice('artifacts/'.length),
      url: blob.url,
      time: new Date(blob.uploadedAt).getTime(),
    }));
  }

  const files = await fs.readdir(outputDir, { withFileTypes: true });
  return Promise.all(files.filter(file => file.isFile()).map(async file => {
    const stats = await fs.stat(path.join(outputDir, file.name));
    return { name: file.name, url: `/output/${encodeURIComponent(file.name)}`, time: stats.mtimeMs };
  }));
}

module.exports = { isVercel, isBlobEnabled, saveArtifact, readArtifact, listArtifacts };
