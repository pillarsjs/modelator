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

const ModelatorMongoDriver = require('../lib/mongoInterface.js');
const MongoClient = require('mongodb').MongoClient;
const mongoService = createMongoConnection();
const driver = new ModelatorMongoDriver({service : mongoService});
Modelator.debug = true; // Show all debug (and colorfull) info of modalating process


// Modelator schema example, mix of many stuffs
const myModelator = module.exports = new Modelator({
  id: "myModelator",
  limit : 50,
  languages : ['en','es'],
  driver,
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
          function avoidA(context, done){
            if(context.result.indexOf('A')>=0){
              done("A no is possible");
            } else {
              done();
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
      driver,
      on : {
        insert : [function showMessage(context, done){
          console.log("\n", " ---> INSERT EVENT for list <--- ".bgBlue, "\n");
          done();
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
            update : [function(context, done){
              done('forced-error');
            }]
            */
          }
        }),
        new SchemaArray({
          id:'sublist',
          driver,
          on : {
            insert : [function showMessage(context, done){
              console.log("\n", " ---> INSERT EVENT for list <--- ".bgBlue, "\n");
              done();
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



/* database service manager, base for refactor as Pillar service */

function createMongoConnection(){
  var connection = new MongoClient();
  connection.params = undefined;
  connection.database = undefined;
  connection.start = function(params, callback, restart){

    if(connection.database && !restart){
      if(callback){
        callback(undefined, connection);
      }
      return connection;
    }

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


