const otherWindowIPC = require('../other-window-ipc');
const {ipcRenderer} = require('electron');
const log = require('./log');

var once = true;
var name = window.location.search.substring(1);

// Talk to common-window's "blarg" channel
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

// Talk to browser (main) process "pirateTalk" channel
otherWindowIPC.createChannelStream("pirateTalk")
.then(stream => {

  stream.on('ptalk', (...args) => {
    log("pirate saidr:", ...args);
    if (once) {
      once = false;
      stream.send('say', 'Arg to you, from', name);
    } else {
      log("close");
      stream.close();
    }
  });
  stream.send('say', "Hi Matey! It's ", name);

})
.catch(err => {
  console.log(err);
});


