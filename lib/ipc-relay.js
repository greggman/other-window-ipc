"use strict";

const debug = require('debug')('ipc-relay');
const ipcMain = require('electron').ipcMain;
const {webContents} = require('electron');

class IPCRelay {
  constructor() {
    this._channels = {};

    ipcMain.on('registerChannel', (event, channelId) => {
      debug("registerChannel:", channelId, "targetId", event.sender.id);
      if (this._channels[channelId]) {
        throw new Error("channel already exists: " + channelId);
      }
      this._channels[channelId] = event.sender.id;
    });

    ipcMain.on('unregisterChannel', (event, channelId) => {
      debug("unregisterChannel:", channelId, "targetId", event.sender.id);
      const targetId = this._channels[channelId];
      if (targetId === undefined) {
        throw new Error("no such channel: " + channelId);
      }
      if (targetId !== event.sender.id) {
        throw new Error("channel not opened by this window: " + channelId);
      }
      this._channels[channelId] = undefined;
    });

    ipcMain.on('getTargetIdForChannel', (event, localStreamId, channelId) => {
      debug("getTargetIdForChannel:", channelId);
      const targetId = this._channels[channelId];
      if (targetId === undefined) {
        throw new Error("no such channel: " + channelId);
      }
      event.sender.send('informTargetIdForChannel', localStreamId, channelId, targetId);
    });

    // Event is supplied by electron
    ipcMain.on('out-relay', (event, targetId, ...data) => {
      if (targetId === 'main') {
        ipcMain.emit('in-relay', event, event.sender.id, ...data);
      } else {
        var contents = webContents.fromId(targetId);
        if (contents) {
          contents.send('in-relay', event.sender.id, ...data);
        }
      }
    });
  }
}

const g_relay = new IPCRelay();

