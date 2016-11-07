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

    require('other-window-ipc');

In renderer process

    *   For a window that just wants to listen for other windows

            const otherWindowIPC = require('other-window-ipc');

            const channelName = "blarg";
            const ipcChannel = otherWindowIPC.createChannel(channelName);

            ipcChannel.on('connect', (stream) => {

                // listen for events on stream
                steam.on('foobar', (someArg, someOtherArg) => {
                  console.log("got foobar:", someArg, someOtherArg);
                });

                // send something to other side
                stream.send('moo', "said", "the cow");
            });

    *   For a window that wants to send a channel

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

    stream.send(arg1, arg2, arg3, ...);

And listeners will receive those arguments

## Disconnecting

To close a steam call `stream.close`. The corresponding stream on the
other side will receive `disconnect` event. This is the only hardcoded
event.  In other words

    stream.on('disconnect', () => {
       // stream.close was called on the other side
    });

## Channels Must have Unique names

If you have multiple windows that both want to create a channel


## example

You can see one example the example folder

    electron example/main.js

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

*   Make channel.close close all streams?

    Currently all channel close does is unregister the channel.
    All streams are still open and will continue to funciton.

    Maybe that's fine. The channel itself is just a way to
    accept streams. If you want to close all your streams
    then keep your own list of streams. Probably much easier
    than having channel keep track of streams.


