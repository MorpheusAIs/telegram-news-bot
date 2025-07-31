import { Client } from '@notionhq/client';
import fetch from 'node-fetch';
import { parseMetadata } from '../utils/fetchMetadata.js';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Helper function to send a message back to the Telegram chat
async function sendTelegramMessage(chatId, text) {
  try {
    const telegramToken = process.env.TELEGRAM_TOKEN;
    
    // Debug logging
    console.log('Telegram token exists:', !!telegramToken);
    console.log('Telegram token length:', telegramToken ? telegramToken.length : 0);
    console.log('Chat ID:', chatId, 'Type:', typeof chatId);
    console.log('Sending message to Telegram API...');
    
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    console.log('Request URL:', url.replace(telegramToken, 'TOKEN_HIDDEN'));
    
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };
    console.log('Request payload:', payload);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('Telegram API response:', result);
    
    if (!response.ok) {
      console.error('Telegram API error:', result);
      return { ok: false, error: result };
    }
    
    return result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { ok: false, error: error.message };
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

    // Check if URL already exists in the database
    console.log('Checking if URL already exists in database:', process.env.NOTION_DATABASE_ID);
    const existingPages = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'url',
        url: {
          equals: url
        }
      }
    });

    if (existingPages.results.length > 0) {
      console.log('URL already exists in database');
      if (chatId) {
        const duplicateMessage = `⚠️ This URL already exists in Notion.`;
        const result = await sendTelegramMessage(chatId, duplicateMessage);
        console.log('Duplicate message sent to chat:', chatId, 'Result:', result);
      }
      return res.status(200).json({ ok: true, message: 'URL already exists' });
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
      const result = await sendTelegramMessage(chatId, confirmationMessage);
      console.log('Confirmation message sent to chat:', chatId, 'Result:', result);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}