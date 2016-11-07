const debug = require('debug')('ipc-manager');
const EventEmitter = require('events');
const ipcBase = require('./ipc-' + process.type);
const IPCStream = require('./ipc-stream');
const IPCChannel = require('./ipc-channel');

class OtherWindowIPC extends EventEmitter {
  constructor(otherId) {
    super();
    this.otherId = otherId;
  }

  send(eventName, ...data) {
//debug("send: ", eventName, ...data);
//debug((new Error()).stack);
    ipcBase.send('out-relay', this.otherId, eventName, ...data);
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
    this._handleInformOtherIdForChannel = this._handleInformOtherIdForChannel.bind(this);

    this._handlers = {
      relay: this._handleStreamRelay,           // pass messages to stream
      connect: this._handleChannelConnect,      // connect to a channel
      disconnect: this._handleStreamDisconnect, // disconnect a stream
      start: this._handleStreamStart,           // receive the remoteStreamId for a new stream
    };

    ipcBase.on('in-relay', this._handleRelay);
    ipcBase.on('informTargetIdForChannel', this._handleInformOtherIdForChannel);
  }
  _removeChannel(channel, channelId) {
    if (this._channels[channelId] !== channel) {
      throw new Error("channel id does nt match");
    }
    delete this._channels[channelId];
  }
  _createStream(otherWindowIPC, localStreamId, channelId) {
    const closeFn = () => {
      this._removeStream(stream, localStreamId);
    };
    const stream = new IPCStream(closeFn, otherWindowIPC, localStreamId, channelId);
    return stream;
  }
  _handleChannelConnect(otherWindowIPC, remoteStreamId, channelId) {
    debug("handleChannelConnect:", channelId);
    const localStreamId = this._nextStreamId++;
    const stream = this._createStream(otherWindowIPC, localStreamId, channelId);
    stream.setRemoteStreamId(remoteStreamId);
    this._streams[localStreamId] = stream;
    const channel = this._channels[channelId];
    if (!channel) {
      otherWindowIPC.send('start', remoteStreamId, false);
      throw new Error("can not connect to non existent channel: " + channelId);
    }
    otherWindowIPC.send('start', remoteStreamId, true, localStreamId);
    channel._addStream(stream);
  }
  _handleStreamRelay(otherWindowIPC, localStreamId, ...args) {
    const stream = this._getStream(localStreamId);
    stream.emit(...args);
  }
  _handleStreamStart(otherWindowIPC, localStreamId, success, remoteStreamId) {
    debug("handleStreamStart:", localStreamId, remoteStreamId);
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
  _handleStreamDisconnect(otherWindowIPC, localStreamId) {
    debug("handleStreamDisconnect:", localStreamId);
    const stream = this._getStream(localStreamId);
    if (!stream) {
      throw new Error("stream no stream for id");
    }
    delete this._streams[localStreamId];
    stream.disconnect();
  }
  _removeStream(localStream, localStreamId) {
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
//debug("handleRelay: ", ...args);
//debug((new Error()).stack);
    // Because IPC messages were getting injected
    // deep in some stack in JavaScript we
    // put them on a tick.
    process.nextTick(() => {
      this._handleRelayIPC(...args);
    });
  }
  _handleRelayIPC(remoteWindowId, eventName, ...data) {
//debug("handleRelayIPC: ", remoteWindowId, eventName, ...data);
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
    // just to be backward compatible
    if (channelId === undefined) {
      channelId = otherWindowId;
      otherWindowId = undefined;
    }
    return new Promise((resolve, reject) => {
      const localStreamId = this._nextStreamId++;
      this._pendingStreams[localStreamId] = {
        resolve: resolve,
        reject: reject,
      };

      // So I at first I thought maybe I should just always
      // do 1 message here instead of 2.
      // To do that I started changing the relay code to
      // always go through a channel map. But that's not
      // enough because of streams. I suppose I could make
      // stream maps but this was easy so ...
      if (otherWindowId === undefined) {
        debug("getTargetIdForchannel:", channelId);
        ipcBase.send('getTargetIdForChannel', localStreamId, channelId);
      } else {
        this._connectPendingStream(localStreamId, channelId, otherWindowId);
      }
    });
  }
  _connectPendingStream(localStreamId, channelId, otherWindowId) {
    const pending = this._pendingStreams[localStreamId];
    if (!pending) {
      throw new Error("no pending localStream:" + localStreamId);
    }
    const ipc = this._getById(otherWindowId);
    const localStream = this._createStream(ipc, localStreamId, channelId);
    pending.stream = localStream;
    ipc.send('connect', localStreamId, channelId, otherWindowId);
  }
  // Event is from electron, not the app
  _handleInformOtherIdForChannel(event, localStreamId, channelId, otherWindowId) {
    this._connectPendingStream(localStreamId, channelId, otherWindowId);
  }
  createChannel(channelId) {
    debug("create channel:", channelId);
    if (this._channels[channelId]) {
      throw new Error("channel already in use:", channelId);
    }
    const closeFn = () => {
      this._removeChannel(channel, channelId);
    };
    const channel = new IPCChannel(closeFn, channelId);
    this._channels[channelId] = channel;
    return channel;
  }
}

module.exports = IPCManager;

