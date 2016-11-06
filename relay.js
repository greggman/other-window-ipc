"use strict";

const electron = require('electron');
const {webContents} = require('electron');

class Relay {
  constructor() {
    this._channels = {};

    electron.ipcMain.on('registerChannel', (event, channelId) => {
      if (this._channels[channelId]) {
        throw new Error("channel already exists: " + channelId);
      }
      this._channels[channelId] = event.sender.id;
    });

    electron.ipcMain.on('unregisterChannel', (event, channelId) => {
      const targetId = this._channels[channelId];
      if (targetId === undefined) {
        throw new Error("no such channel: " + channelId);
      }
      if (targetId !== event.sender.id) {
        throw new Error("channel not opened by this window: " + channelId);
      }
      this._channels[channelId] = undefined;
    });

    electron.ipcMain.on('getTargetIdForChannel', (event, localStreamId, channelId) => {
      const targetId = this._channels[channelId];
      if (targetId === undefined) {
        throw new Error("no such channel: " + channelId);
      }
      event.sender.send('informTargetIdForChannel', localStreamId, channelId, targetId);
    });

    // Event is supplied by electron
    electron.ipcMain.on('relay', (event, targetId, ...data) => {
      var contents = webContents.fromId(targetId);
      if (contents) {
        contents.send('relay', event.sender.id, ...data);
      }
    });
  }
}

const g_relay = new Relay();

