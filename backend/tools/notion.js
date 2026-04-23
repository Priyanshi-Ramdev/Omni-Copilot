const { Client } = require('@notionhq/client');
const { getToken } = require('../auth/notionOAuth');

async function getClient(userId) {
  const token = await getToken(userId);
  return new Client({ auth: token });
}

async function createPage({ title, content, parentPageId, userId }) {
  const notion = await getClient(userId);
  let parent;
  if (parentPageId) {
    parent = { type: 'page_id', page_id: parentPageId };
  } else {
    // Public OAuth integrations cannot create top-level workspace pages.
    // Find the first accessible page to use as the parent default.
    const res = await notion.search({ filter: { property: 'object', value: 'page' }, page_size: 1 });
    if (res.results && res.results.length > 0) {
      parent = { type: 'page_id', page_id: res.results[0].id };
    } else {
      // Fallback that might only work for internal integrations
      parent = { type: 'workspace', workspace: true };
    }
  }

  // Convert markdown-like content to Notion blocks
  const blocks = contentToBlocks(content);
  const page = await notion.pages.create({
    parent,
    properties: { title: { title: [{ text: { content: title } }] } },
    children: blocks,
  });
  return {
    success: true, pageId: page.id, title,
    link: page.url,
    message: `Notion page "${title}" created`,
  };
}

async function searchPages({ query, userId }) {
  const notion = await getClient(userId);
  const res = await notion.search({ query, page_size: 10 });
  const results = res.results.map(r => ({
    id: r.id, type: r.object,
    title: r.properties?.title?.title?.[0]?.plain_text || r.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
    link: r.url,
    created: r.created_time,
  }));
  return { success: true, count: results.length, results };
}

async function listPages({ limit = 10, userId } = {}) {
  const notion = await getClient(userId);
  const res = await notion.search({ filter: { property: 'object', value: 'page' }, page_size: limit, sort: { direction: 'descending', timestamp: 'last_edited_time' } });
  const pages = res.results.map(r => ({
    id: r.id,
    title: r.properties?.title?.title?.[0]?.plain_text || r.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
    link: r.url,
    lastEdited: r.last_edited_time,
  }));
  return { success: true, count: pages.length, pages };
}

function contentToBlocks(content) {
  if (!content) return [];
  const lines = content.split('\n');
  const blocks = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: line.replace(/^# /, '') } }] } });
    } else if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: line.replace(/^## /, '') } }] } });
    } else if (line.startsWith('- ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: line.replace(/^- /, '') } }] } });
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } });
    }
  }
  return blocks.slice(0, 100); // Notion API limit
}

async function readPage({ pageId, userId }) {
  const notion = await getClient(userId);
  const res = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  
  let content = '';
  for (const block of res.results) {
    if (block.type === 'paragraph' && block.paragraph.rich_text.length) {
      content += block.paragraph.rich_text.map(t => t.plain_text).join('') + '\n';
    } else if (block.type.startsWith('heading') && block[block.type].rich_text.length) {
      content += '# ' + block[block.type].rich_text.map(t => t.plain_text).join('') + '\n';
    } else if (block.type.includes('list_item') && block[block.type].rich_text.length) {
      content += '- ' + block[block.type].rich_text.map(t => t.plain_text).join('') + '\n';
    }
  }
  return { success: true, pageId, textContent: content || '(empty page or no supported text blocks)' };
}

module.exports = { createPage, searchPages, listPages, readPage };
