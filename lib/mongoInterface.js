/* jslint node: true, esnext: true */
"use strict";

var ObjectID = require('mongodb').ObjectID;
var mongoInterface = module.exports = {};

function mongoId(stringId){
	return /^[a-f0-9]{24}$/i.test(stringId)? new ObjectID.createFromHexString(stringId) : stringId;
}

mongoInterface.count = function(mongoDB, modelator, params, cb, user, keys){
	
	keys = Array.isArray(keys)? keys : [keys];

	let grant = false;
	const query = {};
	if(modelator.keysCheck(keys, 'get')){
		grant = true;
	} else if(user) {
		const owner = modelator.keysCheck(keys.concat(['owner']), 'get');
		const guest = modelator.keysCheck(keys.concat(['guest']), 'get');
		if(owner || guest){
			grant = true;
			query.$and = [];
		}
		if(owner && guest){
			query.$and.push({
				$or:[{_author : user}, {_guests : user}]
			});
		} else if(owner){
			query.$and._owner = user;
		} else if(owner){
			query.$and._guests = user;
		}
	}

	if(grant){
		const dbc = mongoDB.collection(modelator.collection);
		dbc.count(query, function(error, count) {
			if(error){
				cb({
					error : "count-error",
					details : error
				});
			} else {
				cb({
					error : undefined,
					data : count
				});
			}
		});
	} else {
		cb({
			error : "count-forbidden"
		});
	}
};

mongoInterface.list = function(mongoDB, modelator, params, cb, user, keys){

	keys = Array.isArray(keys)? keys : [keys];

	let skip = 0;
	let filter = false;
	let limit = modelator.limit;
	let range = false;
	let order = modelator.order === -1? -1 : 1;
	let sort = modelator.sort || false;

	const cols = {};
	const qsort = {};
	const qors = [];

	let grant = false;
	const query = {};
	if(modelator.keysCheck(keys, 'get')){
		grant = true;
	} else if(user) {
		const owner = modelator.keysCheck(keys.concat(['owner']), 'get');
		const guest = modelator.keysCheck(keys.concat(['guest']), 'get');
		if(owner || guest){
			grant = true;
			query.$and = [];
		}
		if(owner && guest){
			query.$and.push({
				$or:[{_author : user}, {_guests : user}]
			});
		} else if(owner){
			query.$and._owner = user;
		} else if(owner){
			query.$and._guests = user;
		}
	}

	if(grant){
		if(parseInt(params.order, 10) === -1){
			order = -1;
		}
		if(typeof params.sort === 'string' && params.sort !== ''){
			for(const header of modelator.headers){
				if(header === params.sort){
					sort = params.sort;
					break;
				}
			}
		}
		if(sort){
			qsort[sort] = order;
			if(typeof params.range === 'string' && params.range !== ''){
				range = params.range;
				query[sort] = order > 0? {$gt : range} : {$lt : range};
			}
		}
		if(typeof params.skip === 'string' && parseInt(params.skip, 10) > 0){
			skip = parseInt(params.skip, 10);
		}

		if(typeof params.filter === 'string' && params.filter !== ''){
			filter = params.filter;
			for(const filter of modelator.filters){
				const qor = {};
				qor[filter] = new RegExp(filter, "i");
				qors.push(qor);
			}
			if(!query.$and){
				query.$and = [];
			}
			query.$and.push({$or : qors});
		}

		for(const header of modelator.headers){
			cols[header] = true;
		}

		const dbc = mongoDB.collection(modelator.collection);
		dbc.find(query, cols).sort(qsort).skip(skip).limit(limit).toArray(function(error, list) {
			if(error){
				cb({
					error : "list-error",
					details : error
				});
			} else {
				cb({
					error : false,
					data : list,
					meta : {order, sort, range, skip, limit, filter, cols}
				});
			}
		});
	} else {
		cb({
			error : "list-forbidden"
		});
	}
};

mongoInterface.get = function(mongoDB, modelator, params, cb, user, keys){

	keys = Array.isArray(keys)? keys : [keys];

	const id = mongoId(params.id);

	let grant = false;
	const query = {};
	if(modelator.keysCheck(keys, 'get')){
		grant = true;
	} else if(user) {
		const owner = modelator.keysCheck(keys.concat(['owner']), 'get');
		const guest = modelator.keysCheck(keys.concat(['guest']), 'get');
		if(owner || guest){
			grant = true;
			query.$and = [];
		}
		if(owner && guest){
			query.$and.push({
				$or:[{_author : user}, {_guests : user}]
			});
		} else if(owner){
			query.$and._owner = user;
		} else if(owner){
			query.$and._guests = user;
		}
	}

	if(grant){
		if(id){
			query._id = id;
			const dbc = mongoDB.collection(modelator.collection);
			dbc.findOne(query, function(error, doc) {
				if(error){
					cb({
						error : "get-error",
						details : error
					});
				} else if(false) {
					cb({
						error : "get-unreachable"
					});
				} else {
					// context.result._id = id;
					cb({
						error : undefined,
						data : doc
					});
				}
			});
		} else {
			cb({
				error : "get-error"
			});
		}
	} else {
		cb({
			error : "get-forbidden"
		});
	}
};

mongoInterface.update = function(mongoDB, modelator, params, cb, user, keys){

	keys = Array.isArray(keys)? keys : [keys];

	const id = mongoId(params.id);

	let set = params.update || false;

	let grant = false;
	const query = {};
	if(modelator.keysCheck(keys, 'update')){
		grant = true;
	} else if(user) {
		const owner = modelator.keysCheck(keys.concat(['owner']), 'update');
		const guest = modelator.keysCheck(keys.concat(['guest']), 'update');
		if(owner || guest){
			grant = true;
			query.$and = [];
		}
		if(owner && guest){
			query.$and.push({
				$or:[{_author : user}, {_guests : user}]
			});
		} else if(owner){
			query.$and._owner = user;
		} else if(owner){
			query.$and._guests = user;
		}
	}

	if(grant){
		if(id && set){
			query._id = id;
			var update = {};
			update.$set = set.parse();
			// update.$unset = unset;
			var dbc = mongoDB.collection(modelator.collection);
			dbc.update(query, update, function(error, result) {
				if(error){
					cb({
						error : "update-error",
						details : error
					});
				} else if(false) {
					cb({
						error : "update-unreachable"
					});
				} else {
					cb({
						error : false,
						data : result
					});
				}
			});
		} else {
			cb({
				error : "update-error"
			});
		}
	} else {
		cb({
			error : "update-forbidden"
		});
	}
};

mongoInterface.insert = function(mongoDB, modelator, params, cb, user, keys){

	keys = Array.isArray(keys)? keys : [keys];

	let set = params.insert || false;

	let grant = false;
	if(modelator.keysCheck(keys, 'insert')){
		grant = true;
	}

	if(grant){
		if(set){
			const id = new ObjectID();
			set._id = id;
			const dbc = mongoDB.collection(modelator.collection);
			dbc.insert(set, function(error, result) {
				if(error){
					cb({
						error : "insert-error",
						details : error
					});
				} else if(false){
					cb({
						error : "insert-unreachable"
					});
				} else {
					cb({
						error : undefined,
						data : result
					});
				}
			});
		} else {
			cb({
				error : "insert-error"
			});
		}
	} else {
		cb({
			error : "insert-forbidden"
		});
	}
};

mongoInterface.remove = function(mongoDB, modelator, params, cb, user, keys){
	
	keys = Array.isArray(keys)? keys : [keys];

	const id = mongoId(params.id);

	let grant = false;
	const query = {};
	if(modelator.keysCheck(keys, 'get')){
		grant = true;
	} else if(user) {
		const owner = modelator.keysCheck(keys.concat(['owner']), 'get');
		const guest = modelator.keysCheck(keys.concat(['guest']), 'get');
		if(owner || guest){
			grant = true;
			query.$and = [];
		}
		if(owner && guest){
			query.$and.push({
				$or:[{_author : user}, {_guests : user}]
			});
		} else if(owner){
			query.$and._owner = user;
		} else if(owner){
			query.$and._guests = user;
		}
	}

	if(grant){
		if(id){
			query._id = id;
			var dbc = mongoDB.collection(modelator.collection);
			dbc.remove(query, function(error, result) {
				if(error){
					cb({
						error : "remove-error",
						details : error
					});
				} else if(false) {
					cb({
						error : "remove-unreachable"
					});
				} else {
					cb({
						error : undefined,
						data : result
					});
				}
			});
		} else {
			cb({
				error : "remove-error"
			});
		}
	} else {
		cb({
			error : "remove-forbidden"
		});
	}
};


















/*
var paths = require('path');
mongoInterface.files = function(DB,schema,params,user,cb){

	/*
		schema: descriptor de un schema, ver en models.
		params: parametros para la acción, opcional
		user: {id:"",keys:[]}
			id: id de usuario
			keys: llaves que se poseen, opcional
		cb: callback tras realizar la acción
	*

	params = params || {};
	user = user || {};
	var userId = user.id;
	var keys = user.keys || [];

	var query = {}, cols = {};

	var grant = false; // control de permisos

	if(schema.keys.check('get',keys)){
		grant = true;
	} else if(userId && schema.keys.check(keys.concat(['owner']),'get')){
		grant = true;
		query.$or = [{_author:userId},{_guests:userId}];
	}

	if(grant){
		var path = params.path || schema.uploads; // Warning, clean first and end '/'.
		var field = path.split('/').pop();
		var pathOId = oId(path.split('/').slice(2,3).join());

		if(pathOId){
			query._id = pathOId;
			cols[field] = 1;
			var collection = DB.collection(schema.collection);
			collection.findOne(query,cols,function(error, result) {
				if(error){
					cb({
						error : 500,
						details : error
					});
				} else if(!result) {
					cb({
						error : 404
					});
				} else {
					schema.get(result,function(getted, errors){
						if(errors){
							cb({
								error : 403,
								ads : errors
							});
						} else {
							var file = false;
							try {
								file = eval('getted.'+field);
							} catch(error) {
								errors = [error];
							}
							
							if(file){
								var pathfs = paths.resolve(paths.join(schema.uploads,schema.id,path));
								cb({
									error : false,
									data : {
										file: pathfs,
										name: file.name
									}
								});
							} else {
								cb({
									error : 404
								});
							}
						}
					},user,keys);
				}
			});
		} else {
			cb({
				error : 404
			});
		}
	} else {
		cb({
			error : 403
		});
	}
};

*/


















