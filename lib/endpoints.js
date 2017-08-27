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

/* jslint node: true */
"use strict";

// TO DO: Update this two variables with some session stuff
const userId = "someUserID";
const userKeyring = ["A", "B", "admin", "manager_"];


module.exports = modelatorAPI;

/**
 *	Create all the API Endpoints for a given model
 *	@return Route 	A Pillars Route object with all the crud for the schema.
 */
function modelatorAPI() {
	const modelator = this;

	// TO DO: Add a way to access to COUNT JAQL resource
	// TO DO: Return different stuff for each action.

	return new Route({ 
		id: modelator.id, 
		path: '/' + modelator.id 
	}, function(gw) {
		
		const exec = {
			GET: 'get',
			POST: 'insert',
			PUT: 'update',
			PATCH: 'update',
			DELETE: 'remove'
		};

		modelator[exec[gw.method]](
			gw.params || {"_id": 0},
			function(error, context, transaction){
				if(error) {
					gw.statusCode = 500;
					gw.json({ result: 'error' });
				} else {
					gw.json(context.result);
				}
			},
			userId, userKeyring,
			true	// Exec transaction
		);
	});
}	


/*
// ORIGINAL CODE

var mongoInterface = require('./mongoInterface');

module.exports = schemaAPI;

function schemaAPI(route,schema,interface){
	interface = interface || mongoInterface;
	route
		.addRoute(new Route({id:'search',path:'/api'},function(gw){
			interface.list(schema,gw.params,function(result){
				gw.json(result);
			},gw.user);
		}))
		.addRoute(new Route({id:'get',path:'/api/:_id'},function(gw){
			interface.get(schema,gw.params,function(result){
				gw.json(result);
			},gw.user);
		}))
		.addRoute(new Route({id:'update',path:'/api/:_id',method:'put',multipart:true},function(gw){
			interface.update(schema,gw.params,function(result){
				gw.json(result);
			},gw.user);
		}))
		.addRoute(new Route({id:'insert',path:'/api',method:'post',multipart:true},function(gw){
			interface.insert(schema,gw.params,function(result){
				gw.json(result);
			},gw.user);
		}))
		.addRoute(new Route({id:'remove',path:'/api/:_id',method:'delete'},function(gw){
			interface.remove(schema,gw.params,function(result){
				gw.json(result);
			},gw.user);
		}))
		.addRoute(new Route({id:'files',path:'/files/*:path',method:'get'},function(gw){
			interface.files(schema,gw.params,function(result){
				if(result.error){
					gw.error(result.error,result.details);
				} else {
					gw.file(result.data.file,result.data.name);
				}
			},gw.user);
		}))
	;
	return route;
}
*/
