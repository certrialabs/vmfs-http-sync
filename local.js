var chokidar = require('chokidar');
var http = require('http');
var fs = require('fs')

var utils = require('./utils');

server_address=process.argv[process.argv.length - 3];
server_port=process.argv[process.argv.length -2];
path=process.argv[process.argv.length - 1];

var sendChange = function(event, file, checkSum, callback) {
  var options = {
    host: server_address,
    port: server_port,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  var req = http.request(options, function(res) {
    var data="";
    res.on('data', function (chunk) {
      data+=chunk;
    });
    res.on('end', function (chunk) {
      console.log('response received ' + data);
    });
  });

  postData = JSON.stringify({
    event: event,
    file: file,
    checkSum: checkSum,
  });

  req.write(postData);

  req.end();
};

chokidar.watch(
  path,
  { ignored: /[\/\\]\./, ignoreInitial: true}
).on('all', function(event, file) {
  var sharedFile=file.replace(path, '');
  fs.stat(file, function(err, stats) {
    // Just send event directly to the remote machine for missing files
    if (err && err.code === 'ENOENT') {
      sendChange(event, sharedFile, null, null);
      return;
    }
    if(stats.isFile()) {
      utils.calcHash(file, function(error, sha1) {
        if (error != null) {
          if (error.code == 1) {
            console.log('missing file');
          }
        } else {
          sendChange(event, sharedFile, sha1, null);
        }
      });
    } else {
      sendChange(event, sharedFile, null, null);
    }
  })
});
