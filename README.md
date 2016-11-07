#Other-Window-IPC

There's probably an easier way to do this so if so please tell me but
here's a solution just in case.

I needed/wanted to be able to pass messages between Electron windows.

So, this module.

## Usage

There are `IPChannels` and `IPCSteams`. You can think of an `IPCChannel`
just like an http listener on a port except instead of numbers we use strings.

Any window can have multiple `IPCChannel`s. An `IPCChannel`s sole purpose
is to listen for connections. Connections are `IPCStreams`

In browser process

    const otherWindowIPC = require('other-window-ipc');

Note you must have this even if you don't use it in the browser
process.

In renderer or browser process

*   For a process that just wants to listen for other processes

        const otherWindowIPC = require('other-window-ipc');

        const channelName = "blarg";
        const ipcChannel = otherWindowIPC.createChannel(channelName);

        ipcChannel.on('connect', (stream) => {

            // listen for events on stream
            steam.on('moo', (someArg, someOtherArg) => {
              console.log("got moo:", someArg, someOtherArg);
            });

            // send something to other side
            stream.send('foobar', "foo", "bar");
        });

*   For a process that wants to open a stream on a channel

        const otherWindowIPC = require('other-window-ipc');

        const channelName = "blarg";
        otherWindowIPC.createChannelStream(channelName)
        .then(stream => {

            // listen for events on stream
            steam.on('foobar', (someArg, someOtherArg) => {
              console.log("got foobar:", someArg, someOtherArg);
            });

            // send something to other side
            stream.send('moo', "said", "the cow");

        })
        .catch(err => {
          console.log("err");
        });

Note `send` works the same as the standard `EventEmitter.emit` in that you
can pass muliple arguments, etc..

    stream.send(type, arg2, arg3, ...);

And listeners will receive those arguments

## Disconnecting

To close a stream call `stream.close`. The corresponding stream on the
other side will receive `disconnect` event. This is the only hardcoded
event.  In other words

    stream.on('disconnect', () => {
       // stream.close was called on the other side
    });

## API / Usage

    const otherWindowIPC = require('./other-window-ipc');

There are only 2 functions on `otherWindowIPC`

#### `otherWindowIPC.createChannel(channelId)`

returns an `IPCChannel` and registers the channel.

#### `otherWindowIPC.createChannelStream(channelId)`

returns a `Promise` that resolves to an `IPCStream` once
it has connected to the channel. Rejects if there is
no such channel

### `IPCChannel`

This is returned by `createChannel`. It is an `EventEmitter`
that emits just one event `connect` that gets passed an `IPCStream`.

#### `ipcChannel.close()`

Unregisters the channel. Note: Streams created for that channel
will still be open and functioning. Closing the channel basically
just frees the channelId to be used to create a new channel

### `IPCStream`

This is created by calling `createChannelStream` or is emitted
in the `connect` event on an `IPCChannel`.

It is an `EventEmitter`. Any arguments passed to `send` will
arrive at the corresponding `IPCStream` on the other side.
Arguments must be `JSON.stringify`able.

Otherwise see [`EventEmitter` for docs](https://nodejs.org/api/events.html#events_class_eventemitter)
on adding and removing listeners.

#### `ipcStream.send(type, ...args)`

This is just like the standard `EventEmitter.emit` except
the event will appear on the corresponding `IPCStream` on the
other side.

#### `ipcStream.close()`

Closes the stream. The corresponding `IPCStream` on the other side
will receive a `disconnect` event.

## Install

    npm install other-window-ipc --save

## Example

You can see a working example in the example folder

    git clone https://github.com/greggman/other-window-ipc.git
    npm install
    ./node_electron/.bin/electron example/main.js

## Changelog

*   1.2.0

    *   Allow main/browser process to also create channels
        and streams

*   1.1.0

    *   Keep channel to target mapping in main process

        This means you no longer need a to know the id
        of the window. Just call `createChannel` and pass
        a name. Then use that name in `createChannelStream`

*   1.0.1

    *   Bug fixes

*   1.0.0

    *   Change to use channels and streams so
        you can easily have multiple streams per
        channel

*   0.0.1

    Initial release

## To Do

*   Make `IPCChannel.close` close all streams?

    Currently all `channel.close` does is unregister the channel.
    All streams are still open and will continue to funciton.

    Maybe that's fine. The channel itself is just a way to
    accept streams. If you want to close all your streams
    then keep your own list of streams. Probably much easier
    than having channel keep track of streams.

*   Should it not make instances?

    Currently `require('other-window-ipc')` makes an instance
    of `IPCManager` and returns that instance. It's now ready
    to use. Because `IPCManager` needs to use global services
    like `electron.ipcMain` and `electron.ipcRenderer` there
    doesn't seem to be much point in having multiple instances.

    On the other hand you could pass in some kind of prefix
    that would allow multiple `IPCManager`s to function.
    Not really sure what the point would be. Could also
    pass in an implemention of `ipcMain` or `ipcRenderer`.

    If someone really needs this we file an issue and explain.
    It would be a breaking change.

*   Abstract to the point where you can run channels on top of
    channels.

    You never know when you're going to need to run streams
    over a stream. I probably won't try to do this until I
    run into the use case.

