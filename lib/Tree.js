/* jslint node: true, esnext: true */
"use strict";

const Tree = module.exports.Tree = function Tree(contents){
  // TODO: instance from Map?
  Object.assign(this, contents);
};
  Object.defineProperty(Tree.prototype, 'parse', {enumerable: false, value: function(marks){
    const result = {};
    Tree.treeParseWalker([], this, result, marks);
    return result;
  }});
const TreeArray = module.exports.TreeArray = function TreeArray(array){
  const treeArray = Array.apply(this, array);
  const proto = Object.assign([], Array.prototype);
  Object.defineProperty(proto, 'constructor', {enumerable: false, value: TreeArray});
  Object.setPrototypeOf(treeArray, proto);
  return treeArray;
};
  Object.defineProperty(TreeArray.prototype, 'parse', {enumerable: false, value: Tree.prototype.parse});
  Tree.create = function(dotFormat,array){
    // TODO: on insert ascendent after descendant overwrites
    const tree = new Tree();
    const checklist = array? [] : {};
    Object.getOwnPropertyNames(dotFormat).forEach((index)=>{
      const value = dotFormat[index];
      index = index.split(".");
      const name = index.shift();
      if(index.length > 0){
        const Type = /^[09]+$/.test(index[0])? TreeArray : Tree;
        checklist[name] = checklist[name] || new Type();
        checklist[name] = checklist[name].constructor === Type? checklist[name] : new Type();
        checklist[name][index.join(".")] = value;
      } else {
        checklist[name] = value;
      }
    });
    for(const index in checklist){
      if(checklist[index] instanceof Tree){
        checklist[index] = Tree.create(checklist[index]);
      } else if(checklist[index] instanceof TreeArray){
        checklist[index] = Tree.create(checklist[index],true);
      }
    }
    return array? new TreeArray(checklist) : new Tree(checklist);
  };
  Tree.treeParseWalker = function(path, tree, result, marks){
    const traverse = Tree.isTree(tree) || Tree.isTreeArray(tree);
    if(traverse){
      const keys = Tree.isTreeArray(tree)? tree : Object.getOwnPropertyNames(tree);

      for (let i = 0; i < keys.length; i++) {
        const key = Tree.isTreeArray(tree)? i : keys[i];
        if(Tree.isTreeArray(tree[key]) || Tree.isTree(tree[key])){
          if(marks){result[path.concat([key]).join('.')] = true;}
          Tree.treeParseWalker(path.concat([key]), tree[key], result, marks);
        } else if(tree[key] !== undefined){
          result[path.concat([key]).join('.')] = tree[key];
        } else {
          // ignore undefineds
        }
      }
    }
  };
  Tree.isTreeArray = function(tree){
    return TreeArray.prototype.isPrototypeOf(tree) || (tree && tree.constructor === TreeArray);
  };
  Tree.isTree = function(tree){
    return Tree.prototype.isPrototypeOf(tree)  || (tree && tree.constructor === Tree);
  };
