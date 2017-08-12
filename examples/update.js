/* jslint node: true, esnext: true */
"use strict";

const myModel = require("./myModel");

// Update setence (payload from API endpoint request)
const updateData = {
  _id : 'asdfaf',
  textI18n : {
    en : 'Hello new!',
    es : 'Hola nuevo!'
  },
  text : 'Texto!',
  garbage : '%%%%%',
  list : [
    { // update id
      _id : 'n1001',
      img: "/to.mod.file",
      sublist : [
        { // insert
          chk : 1
        },
        { // update
          _id : 'a',
          chk : false
        }
      ]
    },
    { // insert new element
      img : "/to.new.file",
      text : 'newText'
    },
    { // remove id, no payload
      _id : 'n1000'
    }
  ],
  subset : {
    subsetA : "ModSubset"
  }
};



// Modelator call for update method
console.log("\n\n  MODELATOR - UPDATE\n".bgMagenta + "\n");
console.log(" INPUT \t".bgCyan, JSON.stringify(updateData, undefined, 2), "\n");

myModel.update(
  updateData,                        // Input JAQL setence (update, insert)
  undefined,                         // Result CB
  "someUserID",                      // User ID
  ["A", "B", "admin", "manager_"]    // User keyring
);