#Other-Window-IPC

There's probably an easier way to do this so if so please tell me but
here's a solution just in case.

I needed/wanted to be able to pass messages between Electron windows.

So, this module.

## Usage

In browser process

    require('other-window-ipc');

In renderer process

    *   For a window that just wants to listen for other windows


            const otherWindowIPC = require('../other-window-ipc');

            otherWindowIPC.on('someEventName', function(event, data) {

              ...

              // You can reply to sender if you want
              event.sender.send('someOtherEventName', 'got:' + data + ' send it back');
            });

    *   For a window that wants to send an ipc

            const otherWindowIPC = require('../other-window-ipc');

            const otherIPC = otherWindowIPC.getById(otherWindowId);

            // To send a message
            otherIPC.send('someEventName', 'hello again from other');

            // To listen for a message from that window
            otherIPC.on('someEventName', (event, args) => {

               ...
               // You can reply to sender if you want
               event.sender.send('someOtherEventName', 'got:' + data + ' send it back');
            });

Note `send` works the same as the standard `EventEmitter.emit` in that you
can pass muliple arguments, etc..

    otherIPC.send(arg1, arg2, arg3, ...);

## Getting Ids

This library doesn't deal with getting the ideas of the various windows from
one window to the next. That's left as an excersize to the reader.

You can see one example the example folder

    electron example/main.js


