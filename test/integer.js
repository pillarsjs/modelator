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
				err?testDone():test.fail("Updated integer and value is not a integer");				
			}, undefined, undefined);
		});

		it("Object",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				myInt : {hello: "it's me"}
			};
			model.update(undefined,updateData,function(err,context){
				err?testDone():test.fail("Updated integer and value is not a integer");				
			}, undefined, undefined);
		});

		it("Array",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				myInt : [1]
			};
			model.update(undefined,updateData,function(err,context){
				err?testDone():test.fail("Updated integer and value is not a integer");				
			}, undefined, undefined);
		});
	});
});