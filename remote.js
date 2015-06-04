var http = require('http');
var fs = require('fs-extra');
var utils= require('./utils');

address=process.argv[process.argv.length - 4];
port=process.argv[process.argv.length - 3];
sharedDir=process.argv[process.argv.length -2];
destDir=process.argv[process.argv.length - 1];

var copyFile = function(file, sha1) {
  var src = sharedDir + '/' + file;
  utils.calcHash(src, function(err, calcHash) {
    if (err) {
      console.log('[-] Unable to calculate checksum ' + JSON.stringify(err));
      return;
    }
    if (sha1 != calcHash) {
      console.log('[-] File Version Missmatch');
    }
    var dst = destDir + '/' + file;
    console.log('[.] Coping File ' + src + ' to ' + dst);
    fs.copy(src, dst, function(err) {
      if (err) {
        console.log('[-] ' + err);
      } else {
        console.log('[+] File ' + src + ' copied to ' + dst);
      }
    });
  });
}

var mkDir = function(dir) {
  var dst = destDir + '/' + dir;
  fs.mkdirs(dst, function(err) {
    if (err) {
      console.log('[-] Unable to create ' + dst + ' directory');
    } else {
      console.log('[+] Directory ' + dst + ' created');
    }
  });
}

var eventDispatch = {
  'add': function(event, file, sha1) {
    console.log('[.] add event received for ' + sharedDir + '/' + file );
    copyFile(file, sha1);
  },
  'unlink': function(event, file, sha1) {
    console.log("Unlinked file " + file);
  },
  'change': function(event, file, sha1) {
    console.log('[.] change event received for ' + sharedDir + '/' + file);
    copyFile(file, sha1);
  },
  'addDir': function(event, dir, sha1) {
    console.log('addDir event received for  ' + sharedDir + '/' + dir);
    mkDir(dir);
  },
  'unlinkDir': function(event, dir, sha1) {
    console.log("Unlinked directory " + dir);
  },
  'default': function(event, file, sha1) {
    console.log('[-] unknown event received ' + event + ' on ' + file);
  },
};

//Clean destDirecotry first
fs.remove(destDir, function(err) {
  if (err) {
    console.log(err);
    return 1;
  }
  fs.copy(sharedDir, destDir, function(err) {
    if (err) {
      console.log(err);
      return 1;
    }
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
  });
})
