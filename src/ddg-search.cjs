const https = require('https');

async function searchAndVerify(query) {
  return new Promise((resolve) => {
    const postData = 'q=' + encodeURIComponent('site:youtube.com ' + query);
    const req = https.request('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = [...data.matchAll(/v=([a-zA-Z0-9_-]{11})/g)];
        if (matches.length > 0) {
          const ids = Array.from(new Set(matches.map(m => m[1])));
          verifyFirstOembed(ids, query, resolve);
        } else {
          resolve(query + ': NOT FOUND');
        }
      });
    });
    req.write(postData);
    req.end();
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
    'bird dog exercise tutorial',
    'pendulum exercise shoulder physical therapy',
    'glute bridge exercise tutorial',
    'quad sets physical therapy',
    'straight leg raise physical therapy'
  ];
  for (const q of queries) {
    const res = await searchAndVerify(q);
    console.log(res);
  }
}

main();
