"use strict";

const otherWindowIPC = require('../other-window-ipc');
const log = require('./log');

const channel = otherWindowIPC.createChannel("blarg");
channel.on('connect', stream => {

  stream.on('hello', data => {
    log("got hello:", data);
    stream.send('hello', 'got:' + data + " send it back");
  });

});





