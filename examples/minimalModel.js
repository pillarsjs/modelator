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
const myModelControl = module.exports = new Modelator({
  id: "minimalModel",
  limit : 5,                            // default page size limit on LIST endpoints
  languages : ['en','es'],              // support languages if i18n (internationalization)
  schema : [
    new Text({
      id:'text',
      i18n : true,
      keys : {
        retrieve : ["owner", "guest"],
        update : ["owner", "guest"],
        insert : [],
        remove : []
      },
      on : {
        update : [
          function avoidAs(context, done){
            if(context.result.indexOf('A')>=0){
              done("A no is possible");
            } else {
              done();
            }         
          },
          function avoidBs(context, done){
            if(context.result.indexOf('B')>=0){
              done("B no is possible");
            } else {
              done();
            }         
          }
        ]
      }
    })
  ]
});
