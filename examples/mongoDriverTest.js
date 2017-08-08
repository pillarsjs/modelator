/* jslint node: true, esnext: true */
"use strict";

require("colors");

const myModel = require("./myModel");
const Chain = require("../lib/Chain");

myModel.constructor.debug = false;

(new Chain())
  /* *
  .add(function(next){
    const sentence = {
      _id : "prueba",
      text : 'Hello 2!',
      list : [
        {
          img : 'imfFalse',
          sublist : [
            {
              chk : false,
              text : 'false 1'
            },
            {
              chk : false,
              text : 'false 2'
            }
          ]
        },
        {
          img : 'imgTrue',
          sublist : [
            {
              chk : true,
              text : 'true 1'
            },
            {
              chk : true,
              text : 'true 2'
            }
          ]
        },
      ]
    };
    // INSERT
    myModel.insert(
      undefined,                         // Original entity (retrieve, remove)
      sentence,                          // Input JAQL setence (update, insert)
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"]    // User keyring
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
  .add(function(){
    // COUNT
    mongoModelator.count(myModel, {},
    function(result){
      chain.next();
    }, 'someUserId', ['A','B','C']);
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
      _id : "prueba-",
      text : 'Hello Mod!',
      list : [
        {
          img : 'imfFalse',
          sublist : [
            {
              chk : false,
              text : 'false 1'
            },
            {
              chk : false,
              text : 'false 2'
            }
          ]
        },
        {
          img : 'imgTrue',
          sublist : [
            {
              chk : true,
              text : 'true 1'
            },
            {
              chk : true,
              text : 'true 2'
            }
          ]
        },
      ]
    };

    // UPDATE
    myModel.update(
      undefined,                         // Original entity (retrieve, remove)
      sentence,                          // Input JAQL setence (update, insert)
      next,                              // Result CB
      "someUserID",                      // User ID
      ["A", "B", "admin", "manager_"]    // User keyring
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







