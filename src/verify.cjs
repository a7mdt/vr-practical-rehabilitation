const https = require('https');

function verifyFirstOembed(id) {
  https.get('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + id + '&format=json', (res) => {
    if (res.statusCode === 200) {
      console.log('SUCCESS: ' + id);
    } else {
      console.log('FAILED: ' + id);
    }
  });
}

verifyFirstOembed('6e1VYLsxMis');
verifyFirstOembed('-twMbBmHwso');
verifyFirstOembed('BnttKqG9jU4'); // try for SLR
