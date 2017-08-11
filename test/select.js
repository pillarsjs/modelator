const test = require('unit.js');
const {
  Modelator,
  Select
} = require('../index');

Modelator.debug = false;

describe("Test input Select - Modelator", function(){	
	describe("Select Integer Not Multiple", function(){		
		const model = new Modelator({
			id: "selectModel",  
			schema : [
				new Select({
					id:'select',
					values : [0,1,2,3,4,5,6]
				})
			]
		});

		it("Values not in array",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				select : [10]
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated values not in select array");				
			}, undefined, undefined);
		});

		it("Duplicate entries",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				select : [1,1]
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated duplicates indexes");				
			}, undefined, undefined);
		});
	});


	describe("Select Integer Multiple", function(){
		//Model
		const model = new Modelator({
			id: "selectModel",  
			schema : [
				new Select({
					id:'selectInt',
					multiple: true,
					values : [0,1,2,3,4,5,6]
				})
			]
		});

		it("Values not in array",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				selectInt : [10,11]
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated values not in select array");				
			}, undefined, undefined);
		});

		it("Duplicate entries",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				selectInt : [1,1]
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated duplicates indexes");				
			}, undefined, undefined);
		});
	});

	describe("Select text not Multiple", function(){
		const model = new Modelator({
			id: "selectModel",  
			schema : [
				new Select({
					id:'selectText',					
					values : ["a","b","c","d"]
				})
			]
		});

		it("Values not in array",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				selectText : ["aaa"]
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated values not in select array");				
			}, undefined, undefined);
		});

		it("Duplicate entries",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				selectText : ["a","a"]
			};
			model.update(undefined,updateData,function(err,context){
				(err && context.errors.size>0)?testDone():test.fail("Updated duplicates indexes");				
			}, undefined, undefined);
		});
	});
});