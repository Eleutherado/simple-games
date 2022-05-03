const path = require('path');
const express = require('express');
const http = require('http');


const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);

// serve the content
app.use(express.static(publicPath));

// connect to port
server.listen(port, () => {
  console.log(`Server is up. Listening on port ${port}.`)
});

