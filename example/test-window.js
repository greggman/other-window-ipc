const otherWindowIPC = require('../other-window-ipc');
const {ipcRenderer} = require('electron');
const log = require('./log');

function main(event, otherId) {
  var once = true;
  var otherIPC = otherWindowIPC.getById(otherId);
  otherIPC.on('hello', (event, args) => {
    log("got msg from other:", args);
    if (once) {
      once = false;
      otherIPC.send('hello', 'hello again from other');
    }
  });
  otherIPC.send('hello', 'hello from other');
}

ipcRenderer.on('getCommonId', main);
ipcRenderer.send('getCommonId');

