"use strict";

const electron = require('electron');
const otherWindowIPC = require('../other-window-ipc')

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

function createWindow (off, url) {
  let window = new BrowserWindow({
    defaultEncoding: "utf8",
    x: off,
    y: off,
  });
  window.loadURL(url);
  window.webContents.openDevTools();
  return window;
}

// Example of also creating a channel in the main process
const channel = otherWindowIPC.createChannel("pirateTalk");
channel.on('connect', stream => {

  stream.on('say', (msg, name) => {
    console.log("got say:", msg, name);
    stream.send('ptalk', "Yo " + name + ". You said " + msg + ", arrrgh!");
  });

  stream.on('disconnect', () => {
    console.log("disconnected");
  });

});



let commonWindow;
let test1Window;
let test2Window;

app.on('ready', () => {
  commonWindow = createWindow(100, `file://${__dirname}/common-window.html`);
  // give commonWindow a chance to open. Seems like it's possible for test window to start
  // before there's a channel to talk to
  setTimeout(() => {
    test1Window = createWindow(200, `file://${__dirname}/test-window.html?Jack`);
    test2Window = createWindow(300, `file://${__dirname}/test-window.html?Jill`);
  }, 500);

  // Example of talking to the "blarg" channel in common-window
  setTimeout(() => {

    var once = true;
    const name = "the-browser-main-process";
    otherWindowIPC.createChannelStream("blarg")
    .then(stream => {

      stream.on('hello', (...args) => {
        console.log("got msg from other:", ...args);
        if (once) {
          once = false;
          stream.send('hello', 'hello again from ' + name);
        } else {
          console.log("close");
          stream.close();
        }
      });
      stream.send('hello', 'hello from ' + name);

    })
    .catch(err => {
      console.log(err);
    });

  }, 1000);  // I hope this is enough time for common-window to open
});

