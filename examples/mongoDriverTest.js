/* jslint node: true, esnext: true */
"use strict";

require("colors");
const MongoClient = require('mongodb').MongoClient;
const mongoConn = createMongoConnection();

const myModel = require("./myModel");
const Chain = require("../lib/Chain");

mongoConn.start({
  database : 'mondelatorTest'
}, function(error, conn){
  if(!error){
    myModel.collection = 'modelatorOne';
    myModel.driver = conn.database;

    (new Chain())
      /* */
      .add(function(next){
        const sentence = {
          radios : 'Hello 2!'
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
      /* *
      .add(function(){
        // UPDATE
        mongoModelator.update(myModel, {
          _id : id,
          hola : 'nah!',
          otro : 'mod'
        },
        function(result){
          chain.next();
        }, 'someUserId', ['A','B','C']);
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
      .add(function(){
        mongoConn.stop();
      })
    .pull();
    

  }
});







/* database service manager, base for refactor as Pillar service */

function createMongoConnection(){
  var connection = new MongoClient();
  connection.params = undefined;
  connection.database = undefined;
  connection.start = function(params, callback){
    var client = this.client;
    if(typeof params === 'function'){
      callback = params;
      params = {};
    }
    if(typeof params === 'string'){
      params = {database:params};
    }
    params = params || {};

    if(!params.url){
      params.port = params.port || 27017;
      params.hostname = params.hostname || 'localhost';
      params.database = params.database || 'pillars';

      var url = 'mongodb://';
      if(params.user){
        url += params.user;
        if(params.password){
          url += ':'+params.password;
        }
        url += '@';
      }
      url += params.hostname;
      url += ':'+params.port;
      if(params.database){
        url += '/'+params.database;
      }
      params.url = url;
    } 

    params.server = params.server || {};
    params.server.auto_reconnect = params.server.auto_reconnect!==false;

    connection.stop(function(error){
      if(!error){
        connection.connect(params.url, function(error, db) {
          if(error) {
            console.log('mongo.error'.bgRed,{params:params,error:error});
          } else {
            connection.database = db;
            connection.params = params;
            console.log('mongo.connect'.bgGreen,{params:params});
          }
          if(callback){
            callback(error, connection);
          }
        });
      } else if(callback){
        callback(error, connection);
      }
    });
    return connection;
  };
  connection.stop = function(callback){
    if(connection.database){
      connection.database.close(function(error) {
        if(!error){
          connection.database = undefined;
          console.log('mongo.disconnect'.bgYellow,{params:connection.params});
        } else {
          console.log('mongo.error'.bgRed,{params:connection.params,error:error});
        }
        if(callback){
          callback(error);
        }
      });
    } else if(callback) {
      callback();
    }
    return connection;
  };
  return connection;
}

