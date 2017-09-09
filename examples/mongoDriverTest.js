/* jslint node: true, esnext: true */
"use strict";

require("colors");

const myModel = require("./myModel");
const Chain = require("../lib/Chain");
const Controllable = require("../lib/Controllable");
const pointerParse = require("../lib/Pointer");
Controllable.debug = false;

(new Chain())
  /* */
  .add(function(next){

    const sentence = {
      _id : "prueba",
      text : 'Hello 2!',
      list : [
        {
          __id : "list1",
          img : 'imgFalse',
          sublist : [
            {
              __id : "sublist11",
              chk : false,
              text : 'false 1'
            },
            {
              __id : "sublist12",
              chk : false,
              text : 'false 2'
            }
          ]
        },
        {
          __id : "list2",
          img : 'imgTrue',
          sublist : [
            {
              __id : "sublist21",
              chk : true,
              text : 'true 1'
            },
            {
              __id : "sublist22",
              chk : true,
              text : 'true 2'
            }
          ]
        },
      ]
    };

    myModel.insert(
      sentence,                          // Input JAQL setence
      function(errors, transaction){
        if(errors){
          console.log(" INSERT ERRORS: ".bgRed);
          for(const [pointer, error] of errors){
            console.log("   " + pointerParse(pointer).red, error);
          }
        } else {
          console.log(" INSERT OK ".bgGreen);
        }
        console.log();
        next();
      },                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {
      "_id" : "prueba",
      "text" : "Hello 2!",
      //"list.sublist" : {"chk" : true},
      "list" : {}
    };

    myModel.get(
      sentence,                          // Input JAQL setence
      function(errors, transaction){
        if(errors){
          console.log(" GET #1 ERRORS: ".bgRed);
          for(const [pointer, error] of errors){
            console.log("   " + pointerParse(pointer).red, error);
          }
        } else {
          console.log(" GET #1 OK: ".bgGreen);
          for(const [pointer, result] of transaction.results){
            console.log("   " + pointerParse(pointer).green, result);
          }
        }
        console.log();
        next();
      },                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {
      _id : "prueba",
      text : 'Hello Mod!',
      list : [
        {
          _id : "list2",
          img : "imgDod"
        },
        {
          _id : "list1"
        },
        {
          __id : "listnuevo1",
          img : 'imgList1.png',
          sublist : [
            {
              chk : false,
              text : 'false 1mod'
            },
            {
              chk : false,
              text : 'false 2mod'
            }
          ]
        },
        {
          __id : "listnuevo2",
          img : 'imgList2.png',
          sublist : [
            {
              chk : true,
              text : 'true 1mod'
            },
            {
              chk : true,
              text : 'true 2mod'
            }
          ]
        },
      ]
    };

    myModel.update(
      sentence,                          // Input JAQL setence
      function(errors, transaction){
        if(errors){
          console.log(" UPDATE #1 ERRORS: ".bgRed);
          for(const [pointer, error] of errors){
            console.log("   " + pointerParse(pointer).red, error);
          }
        } else {
          console.log(" UPDATE #1 OK ".bgGreen);
        }
        console.log();
        next();
      },                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {
      _id : "prueba",
      text : 'Hello Mod2!',
      list : [
        {_id : "list2"},
        {_id : "listnuevo1"},
        {_id : "listnuevo2"},
      ]
    };

    myModel.update(
      sentence,                          // Input JAQL setence
      function(errors, transaction){
        if(errors){
          console.log(" UPDATE #2 ERRORS: ".bgRed);
          for(const [pointer, error] of errors){
            console.log("   " + pointerParse(pointer).red, error);
          }
        } else {
          console.log(" UPDATE #2 OK ".bgGreen);
        }
        console.log();
        next();
      },                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {
      "_id" : "prueba",
      "text" : "Hello Mod2!",
      "list" : {}
    };

    myModel.get(
      sentence,                          // Input JAQL setence
      function(errors, transaction){
        if(errors){
          console.log(" GET #2 ERRORS: ".bgRed);
          for(const [pointer, error] of errors){
            console.log("   " + pointerParse(pointer).red, error);
          }
        } else {
          console.log(" GET #2 OK: ".bgGreen);
          for(const [pointer, result] of transaction.results){
            console.log("   " + pointerParse(pointer).green, result);
          }
        }
        console.log();
        next();
      },                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {_id : "prueba"};

    myModel.remove(
      sentence,                          // Input JAQL setence
      function(errors, transaction){
        if(errors){
          console.log(" REMOVE ERRORS: ".bgRed);
          for(const [pointer, error] of errors){
            console.log("   " + pointerParse(pointer).red, error);
          }
        } else {
          console.log(" REMOVE OK ".bgGreen);
        }
        console.log();
        next();
      },                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){
    myModel.driver.service.stop();
    next();
  })
.pull();







