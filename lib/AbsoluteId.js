/*
/*    Copyright (C) 2017 Francisco Javier Gallego Martín <bifuer.at.gmail.com>
/*
/*    This program is free software: you can redistribute it and/or  modify
/*    it under the terms of the GNU Affero General Public License, version 3,
/*    as published by the Free Software Foundation.
/*
/*    This program is distributed in the hope that it will be useful,
/*    but WITHOUT ANY WARRANTY; without even the implied warranty of
/*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
/*    GNU Affero General Public License for more details.
/*
/*    You should have received a copy of the GNU Affero General Public License
/*    along with this program.  If not, see <http://www.gnu.org/licenses/>.
/*
/*    The Original Code is "Pillars.js Modelator" aka "Modelator"
/*
/*    The Initial Developer of the Original Code is Francisco Javier Gallego Martín <bifuer.at.gmail.com>.
/*    Copyright (c) 2014-2017 Francisco Javier Gallego Martín.  All rights reserved.
/*/

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