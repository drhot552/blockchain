var express = require('express');
var bodyParser = require('body-parser'); //post방식에서 받는방법
var mysql = require('mysql');   //db

//block chain
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

//web3객체를 통해 수지 어카운트 잔액을 조회하고 해당 잔액을 이더로 변환 후 콘솔에 출력한다.
//var balnace = web3.eth.getBalance(web3.eth.getAccounts());
//var value = web3.fromWei(balnace, 'ether');
var myAccounts = web3.eth.getAccounts();

/* accounts 계좌 */
web3.eth.getAccounts(function(err,res){
  if(err){
    console.error(err);
  }
  else {
    console.log(res);
  }
});
//
web3.eth.getBlock(11,function(err,res){
  if(err){
    console.error(err);
  }
  else {
    console.log(res);
  }
});

//get code
//Web3 객체를 통해 Jay 어카운트의 락을 해제하는 콜백함수를 수행..
