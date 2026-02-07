const https = require('http');

http.get('http://localhost:3000/api/permits', (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
        console.log(data.substring(0, 500)); // Log first 500 chars
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
