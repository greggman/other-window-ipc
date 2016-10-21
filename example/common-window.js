"use strict";

const otherWindowIPC = require('../other-window-ipc');
const log = require('./log');

otherWindowIPC.on('hello', function(event, data) {
  log("got hello:", data);
  event.sender.send('hello', 'got:' + data + ' send it back');
});




