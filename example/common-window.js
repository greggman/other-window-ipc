"use strict";

const otherWindowIPC = require('../other-window-ipc');
const log = require('./log');

process.on('uncaughtException', (err) => {
  log(err);
  log(err.stack);
});

const channel = otherWindowIPC.createChannel("blarg");
channel.on('connect', stream => {

  stream.on('hello', data => {
    log("got hello:", data);
    stream.send('hello', 'got:' + data + " send it back");
  });

  stream.on('disconnect', () => {
    log("disconnected");
  });

});





