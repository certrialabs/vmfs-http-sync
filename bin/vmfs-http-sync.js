#!/usr/bin/env node

var winston = require('../lib/utils').winston;

var defaults = {
  logLevel: 'info',
  retries: 1,
};

var argv = require('yargs')
  .usage(
    'Usage:  vmfs-http-sync  <mode> [options]\n\n' +
    '<mode>: Mode in which script will be executed. ' +
    'Options are server or watcher.\n' +
    'Server mode means, it will accept filesystem events over http.\n' +
    'Watcher mode means, it will monitor the given directory and will send events to the server.' +
    'Local mode means it will monitor the given directory and will sync events to anouther local directory.'
   )
  .option('s', {
    alias: 'server',
    describe: 'In server mode it is the listening address of the server.\n' +
              'In watcher mode it is the IP address of the remote vmfs-http-sync server.'
  })
  .option('p', {
    alias: 'port',
    describe: 'In server it is the listening port of the server.\n' +
              'In watcher mode it is the port of the remote vmfs-http-sync server.'
  })
  .option('sharedDir',{
    describe: 'In server mode it is a local mount point of the shared directory from which files will be copied.\n' +
              'In watcher mode it is a local mount point of the shared storage in which we are listening for events.'
  })
  .option('destDir',{
    describe: 'In server mode it is destination directory that needs to stay in sync.\n'+
              'In watcher mode does noting'
  })
  .option('logLevel', {
    default: defaults.logLevel,
    describe: 'Just sets the log level.\n' +
              'Its default value is info and you should be OK if you are not troubleshooting anything. For more extensive logging you can use debug log level.'
  })
  .option('retries', {
    default: defaults.retries,
    describe: 'In server mode this set how many times server will try to sync file between the shared directory and the local copy.\n' +
              'It is useful if you are changing a single file too, this option will make the server to wait till writing is complete.\n' +
              'Its default value is 1 and it works great for us till now, but it depends on your use cases.'
  })
  .help('h')
  .alias('h', 'help')
  .argv;


if (argv._.length != 1) {
  usage();
}

var env = argv._[0];

if (env != 'watcher' && env != 'server' && env != 'local') {
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
  watcherModule.start(server, port, sharedDir, argv.retries);
} else if (env == 'local') {
  var localModule = require('../lib/local');
  localModule.start(server, port, sharedDir, destDir);
}
