import { Client } from '@notionhq/client';
import fetch from 'node-fetch';
import { parseMetadata } from '../utils/fetchMetadata';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Helper function to send a message back to the Telegram chat
async function sendTelegramMessage(chatId, text) {
  try {
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const response = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return null;
  }
}

export default async function handler(req, res) {
  console.log('Received webhook request:', JSON.stringify(req.body));
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).end();
  }

  try {
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    const url = message?.text?.trim();
    
    console.log('Message data:', { chatId, url });

    if (!url || !url.startsWith('http')) {
      console.log('Ignoring non-link message');
      return res.status(200).json({ ok: true }); // Ignore non-links
    }

    console.log('Fetching metadata for URL:', url);
    const metadata = await parseMetadata(url);
    console.log('Metadata:', metadata);

    console.log('Adding to Notion database:', process.env.NOTION_DATABASE_ID);
    const notionPage = await notion.pages.create({
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
    
    console.log('Successfully added to Notion:', notionPage.id);
    
    // Send confirmation message back to the chat
    if (chatId) {
      const confirmationMessage = `✅ <b>${metadata.title || 'Link'}</b> has been saved to Notion.`;
      await sendTelegramMessage(chatId, confirmationMessage);
      console.log('Confirmation message sent to chat:', chatId);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}