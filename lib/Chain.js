/* jslint node: true, esnext: true */
"use strict";

const Chain = module.exports =  function Chain(){
  this.chainlinks = [];
};
  Chain.prototype.add = function(func){
    const args = Array.prototype.slice.call(arguments).slice(1);
    this.chainlinks.push({func:func, args:args});
    return this;
  };
  Chain.prototype.pull = function(){
    if(this.chainlinks.length > 0){
      this.chainlinks[0].func.apply(this,this.chainlinks[0].args.concat([this.next.bind(this)]));
    }
  };
  Chain.prototype.next = function(){
    this.chainlinks.shift();
    this.pull();
  };
