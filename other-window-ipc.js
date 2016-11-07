"use strict";

if (process.type === 'browser') {

  require('./lib/ipc-relay');

}

module.exports = require('./lib/ipc');




