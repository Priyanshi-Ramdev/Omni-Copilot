const fs = require('fs').promises;
const path = require('path');

async function readFile({ filePath }) {
  const absPath = path.resolve(filePath);
  const content = await fs.readFile(absPath, 'utf-8');
  const ext = path.extname(absPath);
  return {
    success: true, filePath: absPath, extension: ext,
    size: content.length, content,
  };
}

async function writeFile({ filePath, content }) {
  const absPath = path.resolve(filePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf-8');
  return { success: true, filePath: absPath, size: content.length, message: `File written: ${absPath}` };
}

async function listDirectory({ dirPath }) {
  const absPath = path.resolve(dirPath);
  const entries = await fs.readdir(absPath, { withFileTypes: true });
  const items = await Promise.all(entries.map(async (e) => {
    const fullPath = path.join(absPath, e.name);
    let size = null;
    if (e.isFile()) {
      try { const stat = await fs.stat(fullPath); size = stat.size; } catch {}
    }
    return { name: e.name, type: e.isDirectory() ? 'directory' : 'file', size, path: fullPath };
  }));
  return { success: true, dirPath: absPath, count: items.length, items };
}

module.exports = { readFile, writeFile, listDirectory };
