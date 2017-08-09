/*
/*    Copyright (C) 2017 Francisco Javier Gallego Martín <bifuer.at.gmail.com>
/*
/*    This program is free software: you can redistribute it and/or  modify
/*    it under the terms of the GNU Affero General Public License, version 3,
/*    as published by the Free Software Foundation.
/*
/*    This program is distributed in the hope that it will be useful,
/*    but WITHOUT ANY WARRANTY; without even the implied warranty of
/*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
/*    GNU Affero General Public License for more details.
/*
/*    You should have received a copy of the GNU Affero General Public License
/*    along with this program.  If not, see <http://www.gnu.org/licenses/>.
/*
/*    The Original Code is "Pillars.js Modelator" aka "Modelator"
/*
/*    The Initial Developer of the Original Code is Francisco Javier Gallego Martín <bifuer.at.gmail.com>.
/*    Copyright (c) 2014-2017 Francisco Javier Gallego Martín.  All rights reserved.
/*/

/* jslint node: true, esnext: true */
"use strict";

const MongoClient = require('mongodb').MongoClient;

/* database service manager, base for refactor as Pillar service */

const mongoService = module.exports = function mongoService(){
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


