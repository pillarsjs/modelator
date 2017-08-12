/* jslint node: true, esnext: true */
"use strict";

const myModel = require("./myModel");
const Controllable = require("../lib/Controllable");

Controllable.debug = false;
// Get setence (JAQL payload from API endpoint request)
/* *
const sentence = {
  "list.sublist" : true,
  "list.sublist.chk" : {eq:true}
};
/* */
/* */
const sentence = {
  "_id" : "598eec54e48844fa899f13fe",
  "text" : "hola",
  "list.sublist" : {"chk" : true}
};
/* */
// Modelator call for get method
console.log("\n\n  MODELATOR - LIST\n".bgMagenta + "\n");

// GET
myModel.get(
  sentence,                          // Input JAQL setence (update, insert)
  undefined,                         // Result CB
  "someUserID",                      // User ID
  ["A", "B", "admin", "manager_"],   // User keyring
  true                               // Exec transaction
);