var chokidar = require('chokidar');
var utils = require('./utils');

path=process.argv[process.argv.length - 1];

chokidar.watch(
  path,
  { ignored: /[\/\\]\./, ignoreInitial: true}
).on('all', function(event, path) {
    utils.calcHash(path, function(error, sha1) {
      if (error != null) {
        if (error.code == 1) {
          console.log('missing file');
        }
      } else {
        sharedFile=path.replace(path, '');
        console.log(event, sharedFile, sha1);
      }
    });
});
