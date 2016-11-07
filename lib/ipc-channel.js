"use strict";

const debug = require('debug')('ipc-channel');
const EventEmitter = require('events');
const ipcBase = require('./ipc-' + process.type);

class IPCChannel extends EventEmitter {
  constructor(closeFn, channelId) {
    super();
    this._closeFn = closeFn;
    this._channelId = channelId;
    ipcBase.send('registerChannel', channelId);
  }
  _addStream(stream) {
    this.emit('connect', stream);
  }
  close() {
    debug("close channel:", this._channelId);
    ipcBase.send('unregisterChanel', this._channelId);
    this._closeFn();
  }
}

module.exports = IPCChannel;

