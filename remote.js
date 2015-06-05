var http = require('http');
var fs = require('fs-extra');
var utils= require('./utils');

var SUCCESS_CODE=200;
var ERROR_CODE=406;

address=process.argv[process.argv.length - 4];
port=process.argv[process.argv.length - 3];
sharedDir=process.argv[process.argv.length -2];
destDir=process.argv[process.argv.length - 1];

var respond = function(responseObject, code, message) {
  responseObject.writeHead(code, {'Content-Type': 'application/json'});
  responseObject.write(JSON.stringify({code: code, message: message}));
  responseObject.end();
}

var copyFile = function(file, sha1, responseObject) {
  var src = sharedDir + '/' + file;
  utils.calcHash(src, function(err, calcHash) {
    if (err) {
      console.log('[-] Unable to calculate checksum ' + JSON.stringify(err));
      respond(responseObject, ERROR_CODE, 'unabled to calculate checksum for ' + file);
      return;
    }
    if (sha1 != calcHash) {
      console.log('[-] File Version Missmatch');
      respond(responseObject, ERROR_CODE, 'file version missmatch for ' + file);
      return;
    }
    var dst = destDir + '/' + file;
    console.log('[.] Coping File ' + src + ' to ' + dst);
    fs.copy(src, dst, function(err) {
      if (err) {
        console.log('[-] ' + err);
        respond(responseObject, ERROR_CODE, JSON.stringify(err));
        return;
      }

      console.log('[+] File ' + src + ' copied to ' + dst);
      respond(responseObject, SUCCESS_CODE, 'File ' + src + ' copied to ' + dst);
    });
  });
}

var mkDir = function(dir, responseObject) {
  var dst = destDir + '/' + dir;
  fs.mkdirs(dst, function(err) {
    if (err) {
      console.log('[-] Unable to create ' + dst + ' directory');
      respond(responseObject, ERROR_CODE, 'unabled to create ' + dst + ' directory');
    } else {
      console.log('[+] Directory ' + dst + ' created');
      respond(responseObject, SUCCESS_CODE, 'directory ' + dst + ' created');
    }
  });
}

var unlink = function(file, type, responseObject) {
  var dst = destDir + '/' + file;
  fs.remove(dst, function(err) {
    if (err) {
      console.log('[-] Unabled to unlink ' + dst + ' ' + type);
      respond(responseObject, ERROR_CODE, 'unabled to unlink ' + dst + ' ' + type);
    } else {
      console.log('[+] ' + type + ' ' + dst + ' unlinked');
      respond(responseObject, SUCCESS_CODE, type + ' ' + dst + ' unlinked');
    }
  });
}

var eventDispatch = {
  'add': function(event, file, sha1, responseObject) {
    console.log('[.] add event received for ' + sharedDir + '/' + file );
    copyFile(file, sha1, responseObject);
  },
  'unlink': function(event, file, sha1, responseObject) {
    console.log('[.] unlink event receiced for ' + sharedDir + '/' + file);
    unlink(file, 'File', responseObject);
  },
  'change': function(event, file, sha1, responseObject) {
    console.log('[.] change event received for ' + sharedDir + '/' + file);
    copyFile(file, sha1, responseObject);
  },
  'addDir': function(event, dir, sha1, responseObject) {
    console.log('[.] addDir event received for  ' + sharedDir + '/' + dir);
    mkDir(dir, responseObject);
  },
  'unlinkDir': function(event, dir, sha1, responseObject) {
    console.log('[.] unlinkDir event received for ' + sharedDir + '/' + dir);
    unlink(dir, 'Directory', responseObject);
  },
  'default': function(event, file, sha1, responseObject) {
    console.log('[-] unknown event received ' + event + ' on ' + file);
    respond(responseObject, 406, 'unkownd event');
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
      console.log('[-] ' + err);
      return 1;
    }
    http.createServer(function(request, response){
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

        eventDispatch[dispatchKey](reqObj['event'], reqObj['file'], reqObj['checkSum'], response);
      });

    }).listen(port, address);

    console.log("[.] Server is listening to http://" + address + ":" + port);
  });
})
