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
/*    The Initial Developer of the Original Code is Consuelo Quilón Gómez <cheloq.at.gmail.com>.
/*    Copyright (c) 2014-2017 Consuelo Quilón Gómez.
/*/

/* jslint node: true, esnext: true */
"use strict";

const test = require('unit.js');
const {
  Modelator,
  Int
} = require('../index');

Modelator.debug = false;

describe("Test input Integer - Modelator", function(){	
	describe("Sending not integer values", function(){		
		const model = new Modelator({
			id: "intModel",  
			schema : [
				new Int({
					id:'myInt'
				})
			]
		});

		it("String",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				myInt : "hello from the other side"
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated integer and value is not a integer");				
			}, undefined, undefined);
		});

		it("Object",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				myInt : {hello: "it's me"}
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated integer and value is not a integer");
			}, undefined, undefined);
		});

		it("Array",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				myInt : [1]
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated integer and value is not a integer");
			}, undefined, undefined);
		});
	});
});