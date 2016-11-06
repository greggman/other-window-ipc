const otherWindowIPC = require('../other-window-ipc');
const {ipcRenderer} = require('electron');
const log = require('./log');

function main(event, otherId) {
  var once = true;

  otherWindowIPC.createChannelStream(otherId, "blarg")
  .then(stream => {

    stream.on('hello', (...args) => {
      log("got msg from other:", ...args);
      if (once) {
        once = false;
        stream.send('hello', 'hello again from other');
      }
    });
    stream.send('hello', 'hello from other');

  })
  .catch(err => {
    console.log(err);
  });
}

ipcRenderer.on('getCommonId', main);
ipcRenderer.send('getCommonId');

