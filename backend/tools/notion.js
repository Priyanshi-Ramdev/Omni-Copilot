const { Client } = require('@notionhq/client');
const { getToken } = require('../auth/notionOAuth');

function getClient() {
  return new Client({ auth: getToken() });
}

async function createPage({ title, content, parentPageId }) {
  const notion = getClient();
  const parent = parentPageId
    ? { type: 'page_id', page_id: parentPageId }
    : { type: 'workspace' };

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

async function searchPages({ query }) {
  const notion = getClient();
  const res = await notion.search({ query, page_size: 10 });
  const results = res.results.map(r => ({
    id: r.id, type: r.object,
    title: r.properties?.title?.title?.[0]?.plain_text || r.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
    link: r.url,
    created: r.created_time,
  }));
  return { success: true, count: results.length, results };
}

async function listPages({ limit = 10 } = {}) {
  const notion = getClient();
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

module.exports = { createPage, searchPages, listPages };
