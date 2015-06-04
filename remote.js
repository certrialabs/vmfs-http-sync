var http = require('http');


address=process.argv[process.argv.length - 2];
port=process.argv[process.argv.length - 1];

http.createServer(function(request,response){
  console.log(request.headers);
  var req = "";

  request.on('data', function(chunk) {
    req+=chunk
  });

  request.on('end', function() {
    console.log('there will be no more data.');
    console.log(req);
  });

  response.writeHead(200, {'Content-Type': 'application/json'});
  response.write(JSON.stringify({code: 200, message: 'Hello'}));
  response.end();
}).listen(port, address);

console.log("Server is listening to http://" + address + ":" + port);
