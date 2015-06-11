#!/usr/bin/env node

var winston = require('../lib/utils').winston;

var defaults = {
  logLevel: 'info',
  retries: 1,
};

var argv = require('yargs')
  .usage(
   )
  .option('s', {
    alias: 'server',
  })
  .option('p', {
    alias: 'port',
  })
  .option('sharedDir',{})
  .option('destDir',{})
  .option('logLevel', { default: defaults.logLevel })
  .option('retries', { default: defaults.retries })
  .argv;


function usage() {
  console.log(
    'Usage: ' + argv['$0'] + ' <environment> [options]\n\n' +
    '<environment>: Environment in wich script is executed. ' +
    'Options are server or watcher.'
  );

  process.exit(1);
}

if (argv._.length != 1) {
  usage();
}

var env = argv._[0];

if (env != 'watcher' && env != 'server') {
  usage();
}

if (argv.server === undefined || argv.port === undefined || argv.sharedDir === undefined) {
  usage();
}

var server = argv.server;
var port = argv.port;
var sharedDir = argv.sharedDir;

if (env === 'server' && argv.destDir === undefined) {
  usage();
}

if (env === 'server' && argv.retries != defaults.retries) {
  usage();
}

var destDir = argv.destDir;
var logLevel = argv.logLevel;

winston.level = logLevel;

if (env === 'server') {
  var serverModule = require('../lib/server');
  serverModule.start(server, port, sharedDir, destDir);
} else if(env === 'watcher') {
  var watcherModule = require('../lib/watcher');
  watcherModule.start(server, port, sharedDir, argv.retries)
}

