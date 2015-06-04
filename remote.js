var http = require('http');

address=process.argv[process.argv.length - 2];
port=process.argv[process.argv.length - 1];

var eventDispatch = {
  'add': function(event, file, sha1) {
    console.log("Added file " + file + " with checksum " + sha1);
  },
  'unlink': function(event, file, sha1) {
    console.log("Unlinked file " + file);
  },
  'change': function(event, file, sha1) {
    console.log("Changed file " + file + " with checksum " + sha1);
  },
  'addDir': function(event, dir, sha1) {
    console.log("Created directory " + dir);
  },
  'unlinkDir': function(event, dir, sha1) {
    console.log("Unlinked directory " + dir);
  },
  'default': function(event, file, sha1) {
    console.log('Unknown event occurred ' + event + ' on ' + file);
  },
};

http.createServer(function(request,response){
  var req = "";

  request.on('data', function(chunk) {
    req+=chunk
  });

  request.on('end', function() {
    var reqObj = JSON.parse(req);
    var dispatchKey = reqObj["event"];

    if (!(dispatchKey in eventDispatch)) {
      dispatchKey = 'default';
    }

    eventDispatch[dispatchKey](reqObj['event'], reqObj['file'], reqObj['checkSum']);
  });

  response.writeHead(200, {'Content-Type': 'application/json'});
  response.write(JSON.stringify({code: 200, message: 'Hello'}));
  response.end();
}).listen(port, address);

console.log("Server is listening to http://" + address + ":" + port);
