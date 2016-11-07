"use strict";

const ipcMain = require('electron').ipcMain;

class IPCBrowser {
  constructor() {
    this._loopback = this._loopback.bind(this);
  }
  on(...args) {
    ipcMain.on(...args);
  }
  send(type, ...args) {
    const event = {
      sender: {
        id: 'main',
        send: this._loopback,
      },
    };
    ipcMain.emit(type, event, ...args);
  }
  _loopback(...args) {
    this.send(...args);
  }
};

module.exports = new IPCBrowser();
