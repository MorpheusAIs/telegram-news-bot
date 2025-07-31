import cheerio from 'cheerio';
import fetch from 'node-fetch';

export async function parseMetadata(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') || $('title').text();
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content');

    return { title, description };
  } catch (e) {
    return { title: url, description: '' };
  }
}