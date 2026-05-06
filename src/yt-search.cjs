const https = require('https');

async function searchYouTube(query) {
  return new Promise((resolve) => {
    https.get('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        let match;
        const ids = new Set();
        while ((match = regex.exec(data)) !== null) {
          ids.add(match[1]);
          if (ids.size > 5) break; // Get top 5 unique IDs
        }
        
        if (ids.size > 0) {
          verifyFirstOembed(Array.from(ids), query, resolve);
        } else {
          resolve(query + ': NOT FOUND');
        }
      });
    });
  });
}

function verifyFirstOembed(ids, query, resolve, index = 0) {
  if (index >= ids.length) {
    resolve(query + ': ALL FAILED');
    return;
  }
  const id = ids[index];
  https.get('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + id + '&format=json', (res) => {
    if (res.statusCode === 200) {
      resolve(query + ': ' + id);
    } else {
      verifyFirstOembed(ids, query, resolve, index + 1);
    }
  });
}

async function main() {
  const queries = [
    'straight leg raise exercise physical therapy'
  ];
  for (const q of queries) {
    const res = await searchYouTube(q);
    console.log(res);
  }
}

main();
