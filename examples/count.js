/* jslint node: true, esnext: true */
"use strict";

const myModel = require("./myModel");
const Controllable = require("../lib/Controllable");

Controllable.debug = false;

// Count setence (JAQL payload from API endpoint request)
/* *
const sentence = {
  "list.sublist" : true,
  "list.sublist.chk" : {eq:true}
};
/* */
/* */
const sentence = {
  "_id" : "x",
  "list.sublist" : {chk : true}
};
/* */
// Modelator call for count method
console.log("\n\n  MODELATOR - COUNT\n".bgMagenta + "\n");

// COUNT
myModel.count(
  sentence,                          // Input JAQL setence (update, insert)
  undefined,                         // Result CB
  "someUserID",                      // User ID
  ["A", "B", "admin", "manager_"],   // User keyring
  true                               // Exec transaction
);