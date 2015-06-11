var fs = require('graceful-fs-extra');
var walk = require('walk');
var path = require('path');
var crypto = require('crypto');
var winston = require('winston');

var calcRel = function(srcFile, srcPrefix, dstPrefix) {
  return path.join(dstPrefix, path.normalize(srcFile.replace(srcPrefix, '')));
}

var calcHash = function(filename, callback) {
  var fd = fs.createReadStream(filename);

  var hash = crypto.createHash('sha1');
  hash.setEncoding('hex');

  fd.on('end', function() {
    hash.end();
    callback(null, hash.read());
  });

  fd.on('error', function(err) {
    callback({ code: 1, message: 'calculation error', filename: filename}, null);
  });

  // read all file and pipe it (write it) to the hash object
  fd.pipe(hash);
}

var constructWalker = function(src, callback) {
  var walker = walk.walk(path.normalize(src), {});

  walker.on('errors', function (root, stats, next) {
    callback(stats);
  });

  walker.on('directoryError', function(root, stats, next) {
    callback(stats);
  });

  walker.on('nodeError', function(root, stats, next) {
    callback(stats);
  });

  walker.on('end', function() { callback() });

  return walker;
};

var copyNew = function(src, dst, callback) {
  var walker = constructWalker(src, callback);

  // Copy file when needed
  walker.on('file', function(root, stats, next) {
    var srcFile=path.join(root, stats.name);
    var dstFile=calcRel(srcFile, src, dst);
    winston.debug('Syncing ' + dstFile);
    calcHash(srcFile, function(err, srcHash) {
      if (err) { callback(err); return; }
      calcHash(dstFile, function(err, dstHash) {
        if(srcHash !== dstHash) {
          winston.debug('Coping ' + srcFile + ' to ' + dstFile);
          fs.copy(srcFile, dstFile, function(err) {
            if(err) { callback(err); return;}
            winston.info(srcFile + ' copied to ' + dstFile);
            next();
          });
        } else {
          winston.info(srcFile + ' is identical to ' + dstFile);
          next();
        }
      });
    });
  });

  // Create directory when needed
  walker.on('directory', function(root, stats, next) {
    var srcDir=path.join(root, stats.name);
    var dstDir=calcRel(srcDir, src, dst);
    winston.debug('Creating ' + dstDir);
    fs.ensureDir(dstDir, function (err) {
      if(err) {
        callback(err);
      }
      winston.info(dstDir + ' created');
      next();
    });
  });
}

var removeOld = function(src, dst, callback) {
  var walker = constructWalker(dst, callback);

  var eventHandler = function(root, stats, next) {
    var dstNode = path.join(root, stats.name);
    var srcNode = calcRel(dstNode, dst, src);
    fs.exists(srcNode, function(exists) {
      if (!exists) {
        winston.debug('Removing ' + dstNode);
        fs.remove(dstNode, function(err) {
          if (err) { callback(err); return; }
          winston.info('Removed ' + dstNode);
          next();
        });
      } else {
        winston.info('Coresponding node exists for ' + dstNode);
        next();
      }
    });
  };

  walker.on('file', eventHandler);
  walker.on('directory', eventHandler);
}

// Replace destination with source. Needed because we don't want to remove destination directory inode.
var sync = function(src, dst, callback) {
  // Need to clean acidentally added / because in unix this means it is a directory and there is no way to check if is a symlink
  var clearLastSep = function(node) {
    var sep = new RegExp(path.sep + '$');
    return node.replace(sep, '');
  };
  dst = clearLastSep(dst);
  src = clearLastSep(src);
  fs.lstat(dst, function(err, stats) {
    //If directory is missing there is no stats so we just skip this check
    if (stats && stats.isSymbolicLink()) {
      callback("Destination " + dst + " can't be symbolic link");
      return;
    }
    fs.lstat(src, function(err, stats) {
      if (err) {
        callback("Cloudn't stat " + src);
        return;
      }
      if (stats.isSymbolicLink()) {
        callback("Source " + src + " can't be symbolic link");
        return;
      }
      fs.ensureDir(dst, function(err) {
        if(err) { callback(err); return };
        removeOld(src, dst, function(err) {
          if(err) {callback(err); return;}
          copyNew(src, dst, callback);
        });
      });
    });
  });
}

module.exports = {
  calcHash: calcHash,
  sync: sync,
  SUCCESS_CODE: 200,
  ERROR_CODE: 406,
  winston: winston,
};

