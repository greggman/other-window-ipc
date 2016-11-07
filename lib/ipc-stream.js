"use strict";

const debug = require('debug')('ipc-stream');
const EventEmitter = require('events');

class IPCStream extends EventEmitter {
  // otherWindowId is the id of the window
  // channelId is the id of the service you want to communicate wth
  // running in that other window
  constructor(closeFn, remote, localStreamId, channelId) {
    super();
    this._closeFn = closeFn;  // so we can close
    this._remote = remote;
    this._localStreamId = localStreamId;
    this._remoteStreamId;
    this._channelId = channelId; // this is for debugging only
  }
  // DO NOT CALL this (it is called by IPChannel
  setRemoteStreamId(remoteStreamId) {
    debug("setRemoteStream:", remoteStreamId);
    if (this._remoteStreamId) {
      throw new Error("remoteStreamId already set");
    }
    this._remoteStreamId = remoteStreamId;
  }
  send(...args) {
    if (!this._remoteStreamId) {
      throw new Error("remoteStreamId not set");
    }
    this._remote.send('relay', this._remoteStreamId, ...args);
  }
  // do not call this directly
  disconnect() {
    debug("disconnect stream:", this._remoteStreamId, this._channelId);
    this.emit('disconnect');
    this._remoteStreamId = null;
  }
  close() {
    debug("close:", this._localStreamId, this._channelId);
    if (this._remoteStreamId) {
      this._closeFn();
      this._remote.send('disconnect', this._remoteStreamId);
      this._remoteStreamId = null;
    }
  }
}

module.exports = IPCStream;

