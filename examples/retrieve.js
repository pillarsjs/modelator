/* jslint node: true, esnext: true */
"use strict";

const myModel = require("./myModel");

// Entity data (original Entity/Doc from DB)
const sampleEntity = {
  _id : 'asdfaf',
  _owner : "someUserID",
  _guests : ["friend1","friend2"],
  text : "Texto",
  textI18n : {
    en: "Hello",
    es: "Hola"
  },
  //select : ["B"],
  selectInt : [1,3],
  radios : "A",
  checkboxes : ["B","C"],
  checkbox : 1,
  time : 12345678,
  img : "/to.img",
  list : {
    'n1000' : {
      _guests : ['someUserID'],
      img : "/to.file",
      text : "A"
    },
    'n1001' : {
      img : "/to.file",
      text : "B",
      sublist : {
        'b' : {
          chk : true
        },
        'a' : {
          chk : true
        }
      }
    }
  },
  subset : {
      subsetA : "s1",
      subsetB : "s2",
      subsetC : "s3"
  }
};



// Modelator call for retrieve method
console.log("\n\n  MODELATOR - INSERT\n".bgMagenta + "\n");
console.log(" INPUT \t".bgCyan, JSON.stringify(sampleEntity, undefined, 2), "\n");

myModel.retrieve(
  sampleEntity,                      // Original entity (retrieve, remove)
  undefined,                         // Result CB
  "someUserID",                      // User ID
  ["A", "B", "admin", "manager_"]    // User keyring
);