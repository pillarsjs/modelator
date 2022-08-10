/* jslint node: true, esnext: true */
"use strict";

const pointerParse = module.exports = function pointerParse(pointer, collapse){
  if(typeof pointer === "string"){
    return pointer;
  }
  if(!collapse){
    return pointer.map(function(v, i){
      const isObject = typeof v === 'object';
      v = isObject? (i === 0? v.ref : '') + '[' + v.id + ']' : v;
      return (i > 0 && !isObject? '.' : '') + v;
    }).join('');
  } else {
    return pointer.map(function(v, i){
      const isObject = typeof v === 'object';
      v = isObject? '' : v;
      return (i > 1 && !isObject? '.' : '') + v;
    }).join('');
  }
};

/*
const Pointer = module.exports = function Pointer(preset, controllable, index){
  const pointer = this;
  pointer.elements = [];
  pointer.elements.splice(0,0,...preset.elements);
  if(controllable && index){
    pointer.add(controllable, index);
  }
};
  Pointer.prototype.add = function pointerAdd(controllable, index){
    const pointer = this;
    pointer.elements.splice(0,0,{
        ref : controllable.id,
        id : index,
        driver : controllable.driver 
    });
  };
*/
