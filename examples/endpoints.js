
/** ###########################################################################
  * CAUTION: 
  * ###########################################################################
  * This file needs Pillars to work. It is no added in package.json, so, before
  * executing this example, be sure to install Pillars package. To do it, just
  * execute in your console:
  *
  *   npm install pillars
  *
  * If you don't do it, this example will crash. 
  * ###########################################################################
  */

/* jslint node: true, esnext: true */
"use strict";

const server = require('pillars');
const myModel = require("./myModel");
const Controllable = require("../lib/Controllable");
Controllable.debug = true;

server.services.get('http').configure({
  port: 3000 
}).start();

const routes = myModel.generateApi();
server.routes.add(routes);
