/* jslint node: true, esnext: true */
"use strict";

const myModel = require("./myModel");

// Insert new entity setence (payload from API endpoint request)
const insertData = {
  textI18n : {
    en : 'Hello new!',
    es : 'Hola nuevo!'
  },
  text : 'Texto!',
  garbage : '%%%%%',
  list : [
    {
      img: "/to.mod.file",
      sublist : [
        {
          chk : 1
        },
        {
          chk : false
        }
      ]
    },
    {
      // _id : 0,
      img : "/to.new.file",
      text : 'newText'
    }
  ],
  subset : {
    subsetA : "ModSubset"
  }
};



// Modelator call for insert method
console.log("\n\n  MODELATOR - INSERT\n".bgMagenta + "\n");
console.log(" INPUT \t".bgCyan, JSON.stringify(insertData, undefined, 2), "\n");

myModel.insert(
  undefined,                         // Original entity (retrieve, remove)
  insertData,                        // Input JAQL setence (update, insert)
  undefined,                         // Result CB
  "someUserID",                      // User ID
  ["A", "B", "admin", "manager_"]    // User keyring
);