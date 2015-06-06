var fs = require('graceful-fs-extra');
var crypto = require('crypto');

module.exports = {
  calcHash: function(filename, callback) {
    var fd = fs.createReadStream(filename);

    var hash = crypto.createHash('sha1');
    hash.setEncoding('hex');

    fd.on('end', function() {
      hash.end();
      callback(null, hash.read());
    });

    fd.on('error', function(err) {
      callback({ code: 1, message: 'calculation error'}, null);
    });

    // read all file and pipe it (write it) to the hash object
    fd.pipe(hash);
  },
  SUCCESS_CODE: 200,
  ERROR_CODE: 406,
};

