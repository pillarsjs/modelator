/* jslint node: true, esnext: true */
"use strict";

require("colors");

const myModel = require("./myModel");
const Chain = require("../lib/Chain");
const Controllable = require("../lib/Controllable");

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
          img : 'imfFalse',
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
    // INSERT
    myModel.insert(
      sentence,                          // Input JAQL setence (update, insert)
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* *
  .add(function(){
    // LIST
    mongoModelator.list(myModel, {},
    function(result){
      chain.next();
    }, 'someUserId', ['A','B','C']);
  })
  /* *
  .add(function(next){

    const sentence = {
      list: true,
      sublist : true
    };

    // COUNT
    myModel.count(
      undefined,                         // Original entity (retrieve, remove)
      sentence,                          // Input JAQL setence (update, insert)
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"]    // User keyring
      //true                             // Exec transaction
    );
  })
  /* *
  .add(function(){
    // RETRIEVE
    mongoModelator.retrieve(myModel, {
      _id : id
    },
    function(result){
      chain.next();
    }, 'someUserId', ['A','B','C']);
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

    // UPDATE
    myModel.update(
      sentence,                          // Input JAQL setence (update, insert)
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

    // UPDATE
    myModel.update(
      sentence,                          // Input JAQL setence (update, insert)
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* */
  .add(function(next){

    const sentence = {_id : "prueba"};

    // UPDATE
    myModel.remove(
      sentence,                          // Input JAQL setence (update, insert)
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"],   // User keyring
      true                               // Exec transaction
    );
  })
  /* *
  .add(function(){
    // REMOVE
    mongoModelator.remove(myModel, {
      _id : id
    },
    function(result){
      chain.next();
    }, 'someUserId', ['A','B','C']);
  })
  /* */
.pull();







