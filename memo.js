/* 기본설정 Memo장 기능 만들기 */
var express = require('express');   //express객체생성
var app = express();    //app설정
var bodyParser = require('body-parser'); //post를위한 body-parser설정
var mysql = require('mysql');   //db
var BigNumber = require('bignumber.js');

/* 스마트 컨트랙트 관련*/
var fs = require('fs');
var solc = require('solc');

//blockchain 연결 -> web3
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'alswo5293',
  database : 'o2'
});
conn.connect();


/*smart Contract 예제 */

// 계약올리기 -> miner를 통해서..

//app use setting application/json body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static('uploads')); //middleware 정적인 파일을 위치하는 디렉토리로 하겠다.

//이 디렉토리 파일에 Teamplate파일을 넣겠다. 템플릿 엔진
app.set('views', './memo_file');
app.set('view engine', 'jade');

//////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////Router 부분//////////////////////////////////////////////
//블록체인 확인
app.get(['/memo', '/memo/trans/:trans'], function(req, res){
    var trans = req.params.trans;
  //  var accounts = web3.eth.accounts;
    web3.eth.getAccounts(function(err,accounts){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }
      web3.eth.getBlockNumber(function(err,block){
        if(err){
          console.log(err);
        }
        else{
          res.render('memo', {account:accounts, trans:trans, blocks:block});
        }
      });
    });
});

//계좌 잔액구하기
app.get('/memo/:id/:account', function(req,res){
  var id = req.params.id;
  var account = req.params.account;
  web3.eth.getBalance(account, function(err,result){
    if(err){
      console.log(err);
    }
    //ether로 변경 result
    var ether= web3.utils.fromWei(result,'ether');
    res.render('balance', {result:ether});
  });
});

//memo/songum -> 송금 관련 송금..
app.post('/memo/songum', function(req,res){
  var from_account = req.body.account_from;
  var to_account = req.body.account_to;
  var ether = req.body.ether;
  var password  = "";
  //첫번째 계좌 및 두번째 계좌일경우는 unlock이 필요없음.
  web3.eth.getAccounts(function(err,accounts){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
    if(accounts[0] == from_account){
      password = "pass0";
    }
    else if(accounts[1] == from_account){
      password = "pass1";
    }
    else{
      password = "min";
    }
    //callback Function
    web3.eth.personal.unlockAccount(from_account, password, 600).then((response) => {
      console.log(response);
      var txHash = web3.eth.sendTransaction({
        from:from_account,
        to:to_account,
        value:web3.utils.toWei(ether,"ether")}, function(err,transaction){
          if(err){
            console.log(err);
          }
          else {
            console.log('txHash:' + transaction);
            res.redirect('/memo/trans/' + transaction);
          }
        });
    }).catch((error) => {
      console.log(error);
    });
  });
  //계좌 locking 해제 후 계좌송금
});


//스마트컨트랙트 화면이동
app.post('/memo/contract', function(req,res){
  //스마트컨트랙트 작동
  web3.eth.getAccounts(function(err,accounts){
    if(err){
      console.log(err);
    }
    //스마트컨트랙트 실행할 주소
    var contract_account = accounts[0];
    res.render('smartcontract', {contract_acco:contract_account});
  });
});

app.post('/memo/contract/:account', function(req,res)
{
  web3.eth.getAccounts(function(err,accounts){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
    let source = fs.readFileSync("./contracts/MyContract.sol", 'utf8');
    console.log('compiling contract .....');

    let compiledContract = solc.compile(source);
    console.log('done');

    for (let contractName in compiledContract.contracts) {
        // code and ABI that are needed by web3
        // console.log(contractName + ': ' + compiledContract.contracts[contractName].bytecode);
        // console.log(contractName + '; ' + JSON.parse(compiledContract.contracts[contractName].interface));
        var bytecode = compiledContract.contracts[contractName].bytecode;
        var abi = JSON.parse(compiledContract.contracts[contractName].interface);
        console.log(JSON.stringify(abi, undefined, 2));
    }
    var address = accounts[0];
    //promise에 대한 공부.. estimateGas관련 개발
    var gasEstimate = '';
    web3.eth.estimateGas({to:address,data:'0x' + bytecode}, function(err,res){
        //
    });
    //계약 주소..
    let MyContract = new web3.eth.Contract(abi);
    console.log('deploying contract...');
    //deploy
    MyContract.deploy({
      data: bytecode
      //arguments:[]
    })
    .send({
      from: address,
      gas: 4000000,   //가스?
      gasPrice: '30000000000000',//가스가격
    })
    .then((instance) => {
      console.log(`Address: ${instance.options.address}`);
    });
  });
});

//이더리움 마이닝
app.post('/memo/mining', function(req,res){
  var mining = web3.eth.hashrate;
  //마이닝 속도 확인
  web3.eth.getHashrate(function(err,res){
    console.log(res);
  });
});

//new Account -> 메모.account주소
app.post('/memo/account' , function(req,res){
  console.log("new Account");
  //계좌생성 비밀번호는 min으로 초기화
  var account = web3.eth.personal.newAccount("min", function(err,account){
      if(err){
      }
      else{
        console.log(account);
        res.redirect('/memo/');
      }
  });
});

//new Account


//memo/add
// app.post('/memo/add', function(req, res){    //router
//   //descripion
//   console.log('check');
//   var title = req.body.title;
//   var date = req.body.date;
//   var description = req.body.description;
//   var sql = 'INSERT INTO memo (title, date, description) VALUES(?, ?, ?)';
//   conn.query(sql, [title,date,description],function(err, result, fields){
//     if(err){
//       console.log(err);
//       res.status(500).send('Internal Server Error');
//     }
//     else{
//       //memo_save.jade를 호춣한다.
//       res.render('memo_save');
//     }
//   });
// });

//post
app.post('/memo/save', function(req, res){
  console.log('save');
  res.redirect('/memo/blockchain');
});

//app을 listen
app.listen(4000, function(){
  console.log('Connected memo, 4000 port!');
});
