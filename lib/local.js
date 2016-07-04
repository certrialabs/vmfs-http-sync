var path = require('path');
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

module.exports = {
  start: function(server, port, sharedDir, destDir, maxRetries) {
    maxRetries = maxRetries || 1;
    utils.sync(path.normalize(sharedDir), path.normalize(destDir), function (err) {
      if (err) {
        winston.error(err);
        return 1;
      }
      startHttp(port, server);
    });
  }
};
