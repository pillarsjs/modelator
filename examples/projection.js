/* jslint node: true, esnext: true */
"use strict";

const myModel = require("./myModel");

// Modelator call for projection method
console.log("\n\n  MODELATOR - PROJECTION\n".bgMagenta + "\n");

myModel.projection(
  undefined,                         // Input JAQL setence (update, insert)
  undefined,                         // Result CB
  "someUserID",                      // User ID
  ["A", "B", "admin", "manager_"]    // User keyring
);