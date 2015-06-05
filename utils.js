var fs = require('fs');
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
      console.log('[-] unable to calculate hash for' + filename + '.' + JSON.stringify(err));
      callback({ code: 1, message: 'calculation error'}, null);
    });

    // read all file and pipe it (write it) to the hash object
    fd.pipe(hash);
  },
};

