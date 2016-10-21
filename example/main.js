"use strict";

const electron = require('electron');
require('../other-window-ipc')

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

function createWindow (off, url) {
  let window = new BrowserWindow({
    defaultEncoding: "utf8",
    x: off,
    y: off,
  });
  window.loadURL(url);
  return window;
}

let commonWindow;
let test1Window;
let test2Window;

// I have no idea if there is an easier way for
// a render process to get ids of other windows
// other-window-ipc leaves that up to the app
electron.ipcMain.on('getCommonId', (event, arg) => {
  event.sender.send('getCommonId', commonWindow.webContents.id);
});


app.on('ready', () => {
  commonWindow = createWindow(100, `file://${__dirname}/common-window.html`);
  test1Window = createWindow(200, `file://${__dirname}/test-window.html`);
  test2Window = createWindow(300, `file://${__dirname}/test-window.html`);
});

