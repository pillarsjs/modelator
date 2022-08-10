/* jslint node: true, esnext: true */
"use strict";

const pillars = require("pillars");
const pointerParse = require("./Pointer");

// TO DO: Update this two variables with some session stuff
const userId = "someUserID";
const userKeyring = ["A", "B", "admin", "manager_"];

/**
 *  Create all the API Endpoints for a given model
 *  @return Route   A Pillars Route object with all the crud for the schema.
 */
const modelatorAPI = module.exports = function() {
  const modelator = this;

  // TO DO: Add a way to access to COUNT ModelatorQL resource - Maybe with a new select operator for counts? {select:["user.*","!prop1.subprop2","*prop1.subprop3"],query:{...}}
  // TO DO: Return different stuff for each action.

  const Route = global.Route;
  return new Route({ 
    id: modelator.id, 
    path: '/' + modelator.id 
  }, function(gw) {
    
    const exec = {
      GET: 'get',
      POST: 'insert',
      PATCH: 'update',
      DELETE: 'remove'
    };

    if(gw.headers.query){
      try {
        gw.headers.query = JSON.parse(gw.headers.query);
      } catch(error){
        gw.headers.query = false;
      }
    }

    if(gw.headers.delete){
      try {
        gw.headers.delete = JSON.parse(gw.headers.delete);
      } catch(error){
        gw.headers.delete = false;
      }
    }

    const modelatorQL = gw.headers.query || gw.headers.delete || gw.params;

    modelator[exec[gw.method]](
      modelatorQL,
      function(response){ // (response, errors, transaction)
        if(response.errors.length > 0){
          gw.statusCode = 403; // Forbidden
        }
        return gw.json(response, {deep : 0});
      },
      userId, userKeyring,
      true  // Exec transaction
    );
  });
};
