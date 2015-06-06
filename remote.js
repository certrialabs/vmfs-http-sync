var http = require('http');
var fs = require('graceful-fs-extra');
var utils= require('./utils');

var winston = require('winston');
winston.level = 'warn';

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
      winston.warn('unable to calculate checksum ' + JSON.stringify(err));
      respond(responseObject, utils.ERROR_CODE, 'unabled to calculate checksum for ' + file);
      return;
    }
    if (sha1 != calcHash) {
      winston.warn('file version missmatch received ' + sha1 + ' expected ' + calcHash);
      respond(responseObject, utils.ERROR_CODE, 'file version missmatch for ' + file);
      return;
    }
    var dst = destDir + '/' + file;
    winston.debug('coping File ' + src + ' to ' + dst);
    fs.copy(src, dst, function(err) {
      if (err) {
        winston.warn(err);
        respond(responseObject, utils.ERROR_CODE, JSON.stringify(err));
        return;
      }

      winston.debug('file ' + src + ' copied to ' + dst);
      respond(responseObject, utils.SUCCESS_CODE, 'File ' + src + ' copied to ' + dst);
    });
  });
}

var mkDir = function(dir, responseObject) {
  var dst = destDir + '/' + dir;
  fs.mkdirs(dst, function(err) {
    if (err) {
      winston.warn('unable to create ' + dst + ' directory');
      respond(responseObject, utils.ERROR_CODE, 'unabled to create ' + dst + ' directory');
    } else {
      winston.debug('directory ' + dst + ' created');
      respond(responseObject, utils.SUCCESS_CODE, 'directory ' + dst + ' created');
    }
  });
}

var unlink = function(file, type, responseObject) {
  var dst = destDir + '/' + file;
  fs.remove(dst, function(err) {
    if (err) {
      winston.warn('unabled to unlink ' + dst + ' ' + type);
      respond(responseObject, utils.ERROR_CODE, 'unabled to unlink ' + dst + ' ' + type);
    } else {
      winston.debug(type + ' ' + dst + ' unlinked');
      respond(responseObject, utils.SUCCESS_CODE, type + ' ' + dst + ' unlinked');
    }
  });
}

var eventDispatch = {
  'unlink': function(event, file, sha1, responseObject) {
    winston.debug('unlink event receiced for ' + sharedDir + '/' + file);
    unlink(file, 'File', responseObject);
  },
  'copy': function(event, file, sha1, responseObject) {
    winston.debug('copy event received for ' + sharedDir + '/' + file);
    copyFile(file, sha1, responseObject);
  },
  'addDir': function(event, dir, sha1, responseObject) {
    winston.debug('addDir event received for  ' + sharedDir + '/' + dir);
    mkDir(dir, responseObject);
  },
  'default': function(event, file, sha1, responseObject) {
    winston.warn('unknown event received ' + event + ' on ' + file);
    respond(responseObject, utils.ERROR_CODE, 'unkownd event');
  },
};

//Clean destDirecotry first
fs.remove(destDir, function(err) {
  if (err) {
    winston.error(err);
    return 1;
  }
  fs.copy(sharedDir, destDir, function(err) {
    if (err) {
      winston.error(err);
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

    winston.info("server is listening to http://" + address + ":" + port);
  });
})
