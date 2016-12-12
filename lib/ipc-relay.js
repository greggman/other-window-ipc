"use strict";

const debug = require('debug')('ipc-relay');
const ipcMain = require('electron').ipcMain;
const {webContents} = require('electron');

class IPCConnectionRequest {
  constructor(sender, localStreamId, channelId) {
    this.sender = sender;
    this.localStreamId = localStreamId;
    this.channelId = channelId;
  }
}

class IPCRelay {
  constructor() {
    this._channels = {};
    this._connectionRequests = [];

    this._processConnectionRequest = this._processConnectionRequest.bind(this);

    ipcMain.on('registerChannel', (event, channelId) => {
      debug("registerChannel:", channelId, "targetId", event.sender.id);
      if (this._channels[channelId]) {
        throw new Error("channel already exists: " + channelId);
      }
      this._channels[channelId] = event.sender.id;
      this._processConnectionRequests();
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

    ipcMain.on('getTargetIdForChannel', (event, localStreamId, channelId, timeout) => {
      debug("getTargetIdForChannel:", channelId);
      const request = new IPCConnectionRequest(event.sender, localStreamId, channelId);
      this._connectionRequests.push(request);
      if (timeout !== undefined) {
        setTimeout(this._makeTimeoutForChannelLookup(request), timeout);
      }
      this._processConnectionRequests();
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

  _makeTimeoutForChannelLookup(request) {
    return () => {
      const ndx = this._connectionRequests.indexOf(request);
      if (ndx >= 0) {
        this._connectionRequests.splice(ndx, 1);
        request.sender.send('errorNoChannel', request.localStreamId, request.channelId);
      }
    };
  }

  _processConnectionRequest(request) {
    const targetId = this._channels[request.channelId];
    if (targetId !== undefined) {
      request.sender.send('informTargetIdForChannel', request.localStreamId, request.channelId, targetId);
      return false;
    }
    return true;
  }

  _processConnectionRequests() {
    if (this._connectionRequests.length) {
      this._connectionRequests = this._connectionRequests.filter(this._processConnectionRequest);
    }
  }

}

const g_relay = new IPCRelay();

