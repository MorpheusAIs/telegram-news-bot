# Telegram News Bot

A serverless Telegram bot that saves links shared in a Telegram chat to a Notion database.

## Features

- Automatically saves links shared in Telegram chats to Notion
- Extracts metadata (title, description) from shared links
- Serverless deployment on Vercel

## Setup

1. Create a Telegram bot using [BotFather](https://t.me/botfather)
2. Set up a Notion integration and database
3. Clone this repository
4. Copy `.env.example` to `.env` and fill in your tokens
5. Deploy to Vercel using `npm run deploy`
6. Set up the Telegram webhook using:
   ```
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/telegram"
   ```

## Environment Variables

- `NOTION_TOKEN`: Your Notion API integration token
- `NOTION_DATABASE_ID`: The ID of your Notion database
- `TELEGRAM_TOKEN`: Your Telegram bot token

## Development

Run the development server:

```bash
npm run dev
```