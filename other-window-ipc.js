"use strict";

if (process.type === 'renderer') {

  const EventEmitter = require('events');
  const {ipcRenderer} = require('electron');

  class OtherWindowIPC extends EventEmitter {
    constructor(otherId) {
      super();
      this.otherId = otherId;
    }

    send(eventName, ...data) {
      ipcRenderer.send('relay', this.otherId, eventName, ...data);
    }
  }

  class IPCManager extends EventEmitter {
    constructor() {
      super();
      this.currentId = 0;
      this.byId = {};

      ipcRenderer.on('relay', (...args) => {
         this._handleRelayIPC.apply(this, args);
      });
    }
    _handleRelayIPC(event, senderId, eventName, ...data) {
      var ipc = this.byId[senderId];
      if (ipc) {
        ipc.emit(eventName, {
          sender: {
            send: function(eventName, ...data) {
              ipc.send(eventName, ...data);
            },
          }
        }, ...data);
      } else {
        this.emit(eventName, {
          sender: {
            send: function(eventName, ...data) {
              ipcRenderer.send('relay', senderId, eventName, ...data);
            }
          },
        }, ...data);
      }
    }
    getById(id) {
      let ipc = this.byId[id];
      if (!ipc) {
        ipc = new OtherWindowIPC(id);
        this.byId[id] = ipc;
      }
      return ipc;
    }
  }

  module.exports = new IPCManager();

} else {

  const electron = require('electron');
  const {webContents} = require('electron');

  electron.ipcMain.on('relay', (event, targetId, eventName, ...data) => {
    var contents = webContents.fromId(targetId);
    if (contents) {
      contents.send('relay', event.sender.id, eventName, ...data);
    }
  });

}


