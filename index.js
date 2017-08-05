/* jslint node: true, esnext: true */
"use strict";

global.modulesCache = global.modulesCache || {};
if(global.modulesCache.modelator){
  module.exports = global.modulesCache.modelator;
  return;
}

var crier = require('crier').addGroup('modelator');
var ObjectArray = require('objectarray');
var i18n = require('textualization');
require('date.format');

i18n.load('modelator',__dirname+'/languages/');
const {Tree, TreeArray} = require("./lib/Tree.js");

const {
  Modelator,
  Schema,
  SchemaArray,
  Text,
  Select,
  Radios,
  Checkboxes,
  Checkbox,
  Time,
  Img
} = module.exports = global.modulesCache.modelator = require('./lib/modelator');

// Modelator schema example, mix of many stuffs

const myModelator = new Modelator({
  id: "myModelator",
  limit : 5,
  indexes : ['_id','field1','field2'],
  languages : ['en','es'],
  schema : [
    new Text({id:'text'}),
    new Text({
      id:'textI18n',
      i18n : true,
      keys : {
        retrieve : ["owner", "guest"],
        update : ["owner", "guest"]
      }
    }),
    new Select({
      id:'select',
      multiple: true,
      values : ['A','B','C','D'],
      on : {
        update : [
          function avoidA(context, cb){
            if(context.result.indexOf('A')>=0){
              cb("A no is possible");
            } else {
              cb();
            }         
          }
        ]
      },
      keys : {
        retrieve: 'manager',
        update : 'manager',
        insert : 'manager',
        remove : 'manager'
      }
    }),
    new Select({
      id:'selectInt',
      multiple: true,
      values : [0,1,2,3,4,5,6]
    }),
    new Radios({
      id:'radios',
      values : ['A','B','C','D']
    }),
    new Checkboxes({
      id:'checkboxes',
      values : ['A','B','C','D']
    }),
    new Checkbox({id:'checkbox'}),
    new Time({id:'time'}),
    new Img({id:'img'}),
    new SchemaArray({
      id:'list',
      on : {
        insert : [function showMessage(context,cb){
          console.log("\n", " ---> INSERT EVENT for list <--- ".bgBlue, "\n");
          cb();
        }]
      },
      schema: [
        new Img({
          id:'img',
          keys : {
            update: ["admin","root"],
            //insert: ["god"]
          },
          on : {
            /*
            update : [function(context, cb){
              cb('forced-error');
            }]
            */
          }
        }),
        new SchemaArray({
          id:'sublist',
          on : {
            insert : [function showMessage(context,cb){
              console.log("\n", " ---> INSERT EVENT for list <--- ".bgBlue, "\n");
              cb();
            }]
          },
          schema: [
            new Checkbox({id:'chk'}),
            new Text({id:'text'})
          ]
        }),
        new Text({id:'text'}),
      ]
    }),
    new Schema({
      id:'subset',
      schema: [
        new Text({
          id:'subsetA',
          keys : {
            update: ["admin","root"]
          }
        }),
        new Text({id:'subsetB'}),
        new Text({id:'subsetC'})
      ]
    })
  ]
});






// One JSON document from DB
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



// JAQL (JSON API Query Language) sentences:

// Update entity setence 
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
        {
          chk : 1
        },
        {
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

// Insert new entity setence
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






// Modelator call for update sentence
console.log("\n\n  MODELATOR DO - UPDATE\n".bgMagenta + "\n");
console.log(" INPUT \t".bgCyan, JSON.stringify(updateData, undefined, 2), "\n");
myModelator.do(
  "update",                       // method
  undefined,                      // DB entity
  updateData,                     // sentence
  resultShow,                     // Callback
  "someUserID",                   // user ID
  ["A", "B", "admin", "manager_"] // keytags
);

// Modelator call for insert sentence
console.log("\n\n  MODELATOR DO - INSERT\n".bgMagenta + "\n");
console.log(" INPUT \t".bgCyan, JSON.stringify(insertData, undefined, 2), "\n");
myModelator.do(
  "insert",
  undefined,
  insertData,
  resultShow,
  "someUserID",
  ["A", "B", "admin", "manager_"]
);

// Modelator call for remove sentence
console.log("\n\n  MODELATOR DO - REMOVE\n".bgMagenta + "\n");
console.log(" INPUT \t".bgCyan, JSON.stringify(sampleEntity, undefined, 2), "\n");
myModelator.do(
  "remove",
  sampleEntity,
  undefined,
  resultShow,
  "someUserID",
  ["A", "B", "admin", "manager_"]
);

// Modelator call for retrieve sentence
console.log("\n\n  MODELATOR DO - GET\n".bgMagenta + "\n");
console.log(" INPUT \t".bgCyan, JSON.stringify(sampleEntity, undefined, 2), "\n");
myModelator.do(
  "retrieve",
  sampleEntity,
  undefined,
  resultShow,
  "someUserID_",
  ["A", "B", "admin", "manager_"]
);

// Modelator call for projection scope
console.log("\n\n  MODELATOR DO - PROJECTION\n".bgMagenta + "\n");
myModelator.do(
  "projection",
  undefined,
  undefined,
  resultShow,
  "someUserID_",
  ["A", "B", "admin", "manager_"]
);














/* Console output utils */




function resultShow(error, context){
  const errors = {};
  context.errors.forEach(function(v){
    errors[v[0]] = v[1];
  });
  const inserts = {};
  context.inserts.forEach(function(v){
    inserts[v[0]] = v[1];
  });
  const updates = {};
  context.updates.forEach(function(v){
    updates[v[0]] = v[1];
  });
  const removes = {};
  context.removes.forEach(function(v){
    removes[v[0]] = v[1];
  });
  let projection = {};
  context.projection.forEach(function(v){
    projection[v[0]] = v[1];
  });
  projection = Tree.create(projection).parse();

  console.log("\n\n  MODELATOR OUTPUT\n".black.bgWhite + "\n");
  console.log("\n    PROJECTION:\n".bgCyan, JSON.stringify(projection, undefined, 2), "\n");
  console.log("\n    ERRORS:\n".bgRed, JSON.stringify(errors, undefined, 2), "\n");
  console.log("\n    MAIN:\n".bgCyan, JSON.stringify(context.result, undefined, 2), "\n");
  console.log("\n    INSERTS:\n".bgGreen, JSON.stringify(inserts, undefined, 2), "\n");
  console.log("\n    UPDATES:\n".bgGreen, JSON.stringify(updates, undefined, 2), "\n");
  console.log("\n    REMOVES:\n".bgGreen, JSON.stringify(removes, undefined, 2), "\n");

}

function slashScreen(){
  // Splash screen...
  console.log(("\n\n"+
  "  ###########################################################\n"+
  "  ##·······················································##\n"+
  "  ##·········##############···###···##############·········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##·········###········###···###···###········###·········##\n"+
  "  ##···········####·····###···###···###·····####···········##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##···········####·····###···###···###·····####···········##\n"+
  "  ##·········###········###···###···###········###·········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##·········##############···###···##############·········##\n"+
  "  ##·······················································##\n"+
  "  ###########################################################\n"+
  "\n  Pillars Modelator v.0.0.1\n"
  ).replace(/·/g,' '.bgRed).replace(/#/g,' '.bgWhite));
}