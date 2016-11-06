"use strict";

if (process.type === 'renderer') {

  module.exports = require('./ipc');

} else {

  require('./relay');

}


