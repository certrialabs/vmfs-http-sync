var fs = require('fs');
var crypto = require('crypto');


module.exports = {
  calcHash: function(filename, callback) {
    fs.exists(filename, function(exists) {
      if(!exists) {
        callback({ code: 1, message: 'missing file'}, null);
      } else {
        var fd = fs.createReadStream(filename);
        var hash = crypto.createHash('sha1');
        hash.setEncoding('hex');

        fd.on('end', function() {
          hash.end();
          callback(null, hash.read());
        });
        // read all file and pipe it (write it) to the hash object
        fd.pipe(hash);
      }
    });

  },
};

