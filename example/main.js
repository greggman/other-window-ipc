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
  window.webContents.openDevTools();
  return window;
}

let commonWindow;
let test1Window;
let test2Window;

app.on('ready', () => {
  commonWindow = createWindow(100, `file://${__dirname}/common-window.html`);
  test1Window = createWindow(200, `file://${__dirname}/test-window.html?Jack`);
  test2Window = createWindow(300, `file://${__dirname}/test-window.html?Jill`);
});

