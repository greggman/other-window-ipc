const otherWindowIPC = require('../other-window-ipc');
const {ipcRenderer} = require('electron');
const log = require('./log');

var once = true;
var name = window.location.search.substring(1);

otherWindowIPC.createChannelStream("blarg")
.then(stream => {

  stream.on('hello', (...args) => {
    log("got msg from other:", ...args);
    if (once) {
      once = false;
      stream.send('hello', 'hello again from ' + name);
    } else {
      log("close");
      stream.close();
    }
  });
  stream.send('hello', 'hello from ' + name);

})
.catch(err => {
  console.log(err);
});


