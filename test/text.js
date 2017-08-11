const test = require('unit.js');
const {
  Modelator,
  Text
} = require('../index');

Modelator.debug = false;

describe("Test input Text - Modelator", function(){	
	describe("Sending not String values", function(){		
		const model = new Modelator({
			id: "textModel",  
			schema : [
				new Text({
					id:'myText'
				})
			]
		});

		it("Integer",function(testDone){
			const updateData = {
				_id : 'asdfaf',
				myText : 9
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