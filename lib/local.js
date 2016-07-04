var path = require('path');
var chokidar = require('chokidar');
var fs = require('fs-extra');
var http = require('http');
var utils= require('./utils');
var winston = require('./utils').winston;

function startHttp(port, address) {
  http.createServer(function(request, response){
    var req = "";

    request.on('data', function(chunk) {
      req+=chunk;
    });

    request.on('end', function() {
      if (request.url == '/status') {
        respond(response, utils.SUCCESS_CODE, 'servers is running');
      }
    });

  }).listen(port, address);

  winston.info("server is listening to http://" + address + ":" + port);
}

function startChokidar(sharedDir, destDir, maxRetries) {
  winston.info('watcher started');
  chokidar.watch(
    path.normalize(sharedDir),
    { ignored: /[\/\\]\./, ignoreInitial: true}
  ).on('all', function(event, file) {
    var sharedFile=file.replace(sharedDir, '');
    // replace all path.sep with / becuase in *nix file system \
    // and cause errors we have cross platform syncronization from windows to *nix
    // all commands thats should normalize the path before using it
    sharedFile = sharedFile.replace(path.sep, '/');
    utils.calcHash (path.join(sharedDir, sharedFile), function (sha1) {
      var generate_error_callback = function (err) {
        winston.warn(err);
      };
      var generate_success_callback = function(event, sharedFile, retry, sha1) {
        disptachEvents(event, destDir, sharedDir, sharedFile, sha1, function () {
          //do nothing on successful operation
        },
        function(err) {
          if (retry < maxRetries) {
            generateChange(sharedDir, sharedFile, retry + 1, sha1, generate_success_callback, generate_error_callback);
          }
        });
      };
      generateChange(sharedDir, sharedFile, 0, sha1, generate_success_callback, generate_error_callback);
    });
  }).on('error', function(err) {
    winston.error('unexpected error occured ' + JSON.stringify(err));
  });
}

var disptachEvents = function(event, destDir, sharedDir, sharedFile, sha1, successCallback, errorCallback) {
  var eventDispatch = {
    'unlink': function(event, file, sha1) {
      winston.debug('unlink event receiced for ' + path.join(sharedDir, file));
      utils.unlink(destDir, file, 'File', successCallback, errorCallback);
    },
    'copy': function(event, file, sha1) {
      winston.debug('copy event received for ' + path.join(sharedDir, file));
      utils.copyFile(sharedDir, destDir, file, sha1, successCallback, errorCallback);
    },
    'addDir': function(event, dir, sha1) {
      winston.debug('addDir event received for  ' + path.join(sharedDir, dir));
      utils.mkDir(destDir, dir, successCallback, errorCallback);
    },
    'default': function(event, file, sha1) {
      winston.warn('unknown event received ' + event + ' on ' + file);
    },
  };

  eventDispatch[event](event, sharedFile, sha1);
};

var generateChange = function(sharedDir, file, retry, sha1, successCallback, errorCallback) {
  var localFile = path.join(sharedDir, file);
  var sharedFile = file;
  winston.debug('generateChange called with arguments ' + sharedDir + ' ' + file + ' ' + retry + ' ' + sha1);
  fs.stat(localFile, function(err, stats) {
    // Just send event directly to the remote machine for missing files
    if (err && err.code === 'ENOENT') {
      successCallback('unlink', sharedFile, retry, null);
      return;
    }
    if (err) {
      winston.error('unexpected error occured ' + JSON.stringify(err));
      errorCallback('unexpected error occured ' + JSON.stringify(err));
      return;
    }

    winston.debug('stats for ' + file + ' are ' + JSON.stringify(stats));
    if(stats.isFile()) {
      utils.calcHash(localFile, function(error, sha1) {
        successCallback('copy', sharedFile, retry, sha1);
      });
    } else {
      successCallback('addDir', sharedFile, retry, null);
    }
  });
};

module.exports = {
  start: function(server, port, sharedDir, destDir, maxRetries) {
    maxRetries = maxRetries || 1;
    utils.sync(path.normalize(sharedDir), path.normalize(destDir), function (err) {
      if (err) {
        winston.error(err);
        return 1;
      }
      startChokidar(sharedDir, destDir, maxRetries);
      startHttp(port, server);
    });
  }
};
