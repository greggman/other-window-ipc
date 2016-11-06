"use strict";

if (process.type === 'renderer') {

  const EventEmitter = require('events');
  const {ipcRenderer} = require('electron');

  class IPCStream extends EventEmitter {
    // otherWindowId is the id of the window
    // channelId is the id of the service you want to communicate wth
    // running in that other window
    constructor(manager, remote, localStreamId, channelId) {
      super();
      this._manager = manager;  // so we can close
      this._remote = remote;
      this._localStreamId = localStreamId;
      this._remoteStreamId;
      this._channelId = channelId; // this is for debugging only
    }
    setRemoteStreamId(remoteStreamId) {
      if (this._remoteStreamId) {
        throw new Error("remoteStreamId already set");
      }
      this._remoteStreamId = remoteStreamId;
      if (this._) {
      }
    }
    send(...args) {
      if (!this._remoteStreamId) {
        throw new Error("remoteStreamId not set");
      }
      this._remote.send('relay', this._remoteStreamId, ...args);
    }
    // do not call this directly
    disconnect() {
      this._emit('disconnect');
      this._remoteStreamId = null;
    }
    close() {
      if (this._removeStreamId) {
        this._manager.removeStream(this, this._localStreamId);
        this._remote.send('disconnect', this._remoteStreamId);
        this._remoteStreamId = null;
      }
    }
  }

  class IPCChannel extends EventEmitter {
    constructor(manager, channelId) {
      super();
      this._manager = manager;
      this._channelId = channelId;
    }
    addStream(stream) {
      this.emit('connect', stream);
    }
    close() {
      this._manager.removeChannel(this, this._channelId);
    }
  }

  class OtherWindowIPC extends EventEmitter {
    constructor(otherId) {
      super();
      this.otherId = otherId;
    }

    send(eventName, ...data) {
//console.log("send: ", eventName, ...data);
//console.log((new Error()).stack);
      ipcRenderer.send('relay', this.otherId, eventName, ...data);
    }
  }

  class IPCManager extends EventEmitter {
    constructor() {
      super();
      this._byId = {};  // OtherWindowIPC per Window
      this._nextStreamId = 1;
      this._streams = {};
      this._channels = {};
      this._pendingStreams = {};

      this._handleRelay = this._handleRelay.bind(this);
      this._handleChannelConnect = this._handleChannelConnect.bind(this);
      this._handleStreamDisconnect = this._handleStreamDisconnect.bind(this);
      this._handleStreamRelay = this._handleStreamRelay.bind(this);
      this._handleStreamStart = this._handleStreamStart.bind(this);

      this._handlers = {
        relay: this._handleStreamRelay,           // pass messages to stream
        connect: this._handleChannelConnect,      // connect to a channel
        disconnect: this._handleStreamDisconnect, // disconnect a stream
        start: this._handleStreamStart,           // receive the remoteStreamId for a new stream
      };

      ipcRenderer.on('relay', this._handleRelay);
    }
    removeChannel(channel, channelId) {
      if (this._channels[channelId] !== channel) {
        throw new Error("channel id does nt match");
      }
      delete this._channels[channelId];
    }
    _handleChannelConnect(otherWindowIPC, remoteStreamId, channelId) {
      const localStreamId = this._nextStreamId++;
      const stream = new IPCStream(this, otherWindowIPC, localStreamId, channelId);
      stream.setRemoteStreamId(remoteStreamId);
      this._streams[localStreamId] = stream;
      const channel = this._channels[channelId];
      if (!channel) {
        ipc.send('start', remoteStreamId, false);
        throw new Error("can not connect to non existent channel: " + channelId);
      }
      otherWindowIPC.send('start', remoteStreamId, true, localStreamId);
      channel.addStream(stream);
    }
    _handleStreamRelay(otherWindowIPC, localStreamId, ...args) {
      const stream = this._getStream(localStreamId);
      stream.emit(...args);
    }
    _handleStreamStart(otherWindowIPC, localStreamId, success, remoteStreamId) {
      const pending = this._pendingStreams[localStreamId];
      if (!pending) {
        throw new Error("no pending stream: "+ localStreamId);
      }
      delete this._pendingStreams[localStreamId];
      if (this._streams[localStreamId]) {
        throw new Error("existing stream with same id");
      }
      if (success) {
        const stream = pending.stream;
        this._streams[localStreamId] = stream;
        stream.setRemoteStreamId(remoteStreamId);
        pending.resolve(stream);
      } else {
        pending.reject("could not connect");
      }
    }
    _handleStreamDisconnect(otherWindowIPC, localStream, localStreamId) {
      const stream = this._getStream(localStreamId);
      if (stream !== localStream) {
        throw new Error("stream does not match id");
      }
      delete this._streams[localStreamId];
      stream.disconnect();
    }
    removeStream(localStream, localStreamId) {
      const stream = this._getStream(localStreamId);
      if (stream !== localStream) {
        throw new Error("stream does not match id");
      }
      delete this._streams[localStreamId];
    }
    _getStream(localStreamId) {
      const stream = this._streams[localStreamId];
      if (!stream) {
        throw new Error("no stream id:" + localStreamId);
      }
      return stream;
    }
    // Event is from electron, not the app
    _handleRelay(event, ...args) {
//console.log("handleRelay: ", ...args);
//console.log((new Error()).stack);
      // Because IPC messages were getting injected
      // deep in some stack in JavaScript we
      // put them on a tick.
      process.nextTick(() => {
        this._handleRelayIPC(...args);
      });
    }
    _handleRelayIPC(remoteWindowId, eventName, ...data) {
//console.log("handleRelayIPC: ", remoteWindowId, eventName, ...data);
      const otherWindowIPC = this._getById(remoteWindowId);
      const handler = this._handlers[eventName];
      if (!handler) {
        throw new Error("unknown handler: " + eventName);
      }
      handler(otherWindowIPC, ...data);
    }
    _getById(id) {
      let ipc = this._byId[id];
      if (!ipc) {
        ipc = new OtherWindowIPC(id);
        this._byId[id] = ipc;
      }
      return ipc;
    }
    createChannelStream(otherWindowId, channelId) {
      return new Promise((resolve, reject) => {
        const ipc = this._getById(otherWindowId);
        const localStreamId = this._nextStreamId++;
        const localStream = new IPCStream(this, ipc, localStreamId, channelId);
        this._pendingStreams[localStreamId] = {
          resolve: resolve,
          reject: reject,
          stream: localStream,
        };
        ipc.send('connect', localStreamId, channelId);
      });
    }
    createChannel(channelId) {
      if (this._channels[channelId]) {
        throw new Error("channel already in use:", channelId);
      }
      const channel = new IPCChannel(this, channelId);
      this._channels[channelId] = channel;
      return channel;
    }
  }

  module.exports = new IPCManager();

} else {

  const electron = require('electron');
  const {webContents} = require('electron');

  // Event is supplied by electron
  electron.ipcMain.on('relay', (event, targetId, ...data) => {
    var contents = webContents.fromId(targetId);
    if (contents) {
      contents.send('relay', event.sender.id, ...data);
    }
  });

}


