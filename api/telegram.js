import { Client } from '@notionhq/client';
import fetch from 'node-fetch';
import { parseMetadata } from '../utils/fetchMetadata';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const message = req.body?.message;
  const url = message?.text?.trim();

  if (!url || !url.startsWith('http')) {
    return res.status(200).json({ ok: true }); // Ignore non-links
  }

  const metadata = await parseMetadata(url);

  await notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      title: {
        title: [{ text: { content: metadata.title || url } }],
      },
      url: {
        url,
      },
      description: {
        rich_text: [{ text: { content: metadata.description || '' } }],
      },
      'creation date': {
        date: { start: new Date().toISOString() },
      },
    },
  });

  return res.status(200).json({ ok: true });
}