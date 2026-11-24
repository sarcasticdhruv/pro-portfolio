// Pings IndexNow (Bing, Yandex, Seznam, Naver) with every sitemap URL so new
// or changed posts get crawled quickly. Run after a deploy:
//   npm run indexnow
// Note: Google does not support IndexNow; for Google, submit sitemap.xml and
// use "Request indexing" in Search Console for important URLs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HOST = 'dhruv-choudhary.tech';
const KEY = '5d3f8a1c7b2e4f6a9c0d1e2b3a4f5c6d';

const sitemap = readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf-8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: submitted ${urlList.length} URLs -> HTTP ${res.status}`);
if (res.status >= 400) process.exit(1);
