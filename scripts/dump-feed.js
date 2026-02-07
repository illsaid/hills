const http = require('http');
const fs = require('fs');

console.log('Testing Unified Feed API...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/unified-feed?limit=100',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      console.log(`Count: ${parsedData.count}`);
      fs.writeFileSync('feed_dump.json', JSON.stringify(parsedData, null, 2));
      console.log('Dumped response to feed_dump.json');
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});

req.on('error', (e) => console.error(e));
req.end();
