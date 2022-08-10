/* jslint node: true, esnext: true */
"use strict";

const config = {
  lastTimeStamp : 0,
  server : 1,
  process : 1,
  counter : 0
};

const pad = function(hex, length){
  return (hex.length < length? "0".repeat(length - hex.length) : '') + hex;
};

const absoluteId = module.exports = function(){
  const timeStamp = Date.now();
  if(config.lastTimeStamp !== timeStamp){
    config.counter = 0;
  }
  config.lastTimeStamp = timeStamp;
  const nid = [
    config.server,
    config.process,
    timeStamp,
    config.counter
  ].map(function(int){return int.toString(16);});

  nid[0] = pad(nid[0], 3);
  nid[1] = pad(nid[1], 3);
  nid[2] = pad(nid[2], 11);
  nid[3] = pad(nid[3], 4);
  config.counter++;
  return nid.join('');
};

absoluteId.config = config;
