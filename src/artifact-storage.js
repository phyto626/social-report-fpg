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
      access: 'private',
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
    const { get } = require('@vercel/blob');
    const result = await get(`artifacts/${name}`, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
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
      url: `/output/${encodeURIComponent(blob.pathname.slice('artifacts/'.length))}`,
      time: new Date(blob.uploadedAt).getTime(),
    }));
  }

  const files = await fs.readdir(outputDir, { withFileTypes: true });
  return Promise.all(files.filter(file => file.isFile()).map(async file => {
    const stats = await fs.stat(path.join(outputDir, file.name));
    return { name: file.name, url: `/output/${encodeURIComponent(file.name)}`, time: stats.mtimeMs };
  }));
}

async function readArtifactDetails(outputDir, name) {
  if (!isBlobEnabled) {
    const content = await readArtifact(outputDir, name);
    return content ? { content, contentType: contentTypeFor(name) } : null;
  }

  const { get } = require('@vercel/blob');
  const result = await get(`artifacts/${name}`, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return {
    content: Buffer.from(await new Response(result.stream).arrayBuffer()),
    contentType: result.blob.contentType,
  };
}

function contentTypeFor(name) {
  if (name.endsWith('.html')) return 'text/html; charset=utf-8';
  if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (name.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  return 'application/json; charset=utf-8';
}

module.exports = { isVercel, isBlobEnabled, saveArtifact, readArtifact, readArtifactDetails, listArtifacts };
