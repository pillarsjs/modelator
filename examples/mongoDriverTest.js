/* jslint node: true, esnext: true */
"use strict";

require("colors");

const myModel = require("./myModel");
const Chain = require("../lib/Chain");
// const Controllable = require("../lib/Controllable");
// Controllable.debug = false;

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
      next,                              // Result CB
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
      "list.sublist" : {"chk" : true},
      "list" : {}
    };

    myModel.get(
      sentence,                          // Input JAQL setence
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {
      "list.sublist" : {},
    };

    myModel.count(
      sentence,                          // Input JAQL setence
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
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
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {
      _id : "prueba",
      text : 'Hello Remove!',
      list : [
        {_id : "list2"},
        {_id : "listnuevo1"},
        {_id : "listnuevo2"},
      ]
    };

    myModel.update(
      sentence,                          // Input JAQL setence
      next,                              // Result CB
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
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
.pull();







