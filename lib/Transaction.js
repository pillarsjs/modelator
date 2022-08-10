/* jslint node: true, esnext: true */
"use strict";

const Chain = require("./Chain");
const {Tree, TreeArray} = require("./Tree");

const Transaction = module.exports = function Transaction(context, done){
  const transaction = this;

  transaction.context = context;
  transaction.done = done;
  transaction.results = new Map();
  
  transaction.chain = new Chain();

  const pointer = context.parents;
  const driver =   pointer[0].driver;
  const handler = driver.handle(context.method, transaction, pointer, context.result, true);
  transaction.chain.add(driver[context.method].bind(driver), transaction, pointer, context.result, true, handler);

  transaction.mountSentences("insert", context.inserts);
  transaction.mountSentences("update", context.updates);
  transaction.mountSentences("remove", context.removes);
  transaction.mountSentences("get", context.getters);

  transaction.chain.add(done.bind(transaction, undefined)).pull();
};
  Transaction.prototype.mountSentences = function(method, sentences){
    const transaction = this;
    if(sentences){
      for(const [pointer, sentence] of sentences){
        const driver = pointer.slice(-1)[0].driver;
        const handler = driver.handle(method, transaction, pointer, sentence, false);
        transaction.chain.add(driver[method].bind(driver), transaction, pointer, sentence, false, handler);
      }
    }
  };
