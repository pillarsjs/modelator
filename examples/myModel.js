/* jslint node: true, esnext: true */
"use strict";

// Require field types
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
} = require('../index');



// Modelator schema example, mix of many stuffs
const myModelator = module.exports = new Modelator({
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
