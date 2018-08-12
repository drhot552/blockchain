/* 기본설정 Memo장 기능 만들기 */
var express = require('express');   //express객체생성
var app = express();    //app설정
var bodyParser = require('body-parser'); //post를위한 body-parser설정
var mysql = require('mysql');   //db
var fs = require('fs'); //file 시스템

/* 스마트 컨트랙트 관련*/
var solc = require('solc');

//blockchain 연결 -> web3
var BigNumber = require('bignumber.js');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));


//데이터베이스 커넥션..
var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'alswo5293',
  database : 'block'
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
//블록체인 트랜잭션 확인
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
        // ether-> towei로 변환하여
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
  var sql = 'SELECT s_address FROM smartcontract WHERE id = 1';
  conn.query(sql, function(err, address, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
    console.log(address[0]);
    web3.eth.getAccounts(function(err,accounts){
      if(err){}
      res.render('smartcontract', {address:accounts[0],contract_address:address[0]});
    });
  });
});

//스마트 컨트랙트 실행 -> 스마트컨트랙트 Private Contract
app.post('/memo/contractstart/:account', function(req,res){
  //계좌번호
  var account = req.params.account;
  let source = fs.readFileSync("./contracts/HelloWorld.sol", 'utf8');
  console.log('compiling contract .....');

  let compiledContract = solc.compile(source);
  console.log('done');

  for (let contractName in compiledContract.contracts) {
      // code and ABI that are needed by web3
      var abi = JSON.parse(compiledContract.contracts[contractName].interface);
      //console.log(JSON.stringify(abi, undefined, 2));
  }
  //계약한 주소
  let MyContract = new web3.eth.Contract(abi, account);
  //컨트랙트 주소 -> 컨트랙트를 배포 후 계속 사용은?? (트랜잭션 주소저장 -> (DB))
  console.log("contract정보"+MyContract.options.address);
  // Smart Contract 실행 -> 아스키 코드로 변환해야하는가?
  // MyContract.methods.getMessage().call().then((result) => console.log(web3.utils.fromAscii(result))).catch(e => console.log(e));
  MyContract.methods.getMessage().call(function(err, message){
    if(err){}
    //문자열 출력
    var result  = web3.utils.toAscii(message).replace(/\u0000/g, '');
    var sql = 'SELECT * from smartcontract where id = 1';

    //스마트컨트랙트 주소
    conn.query(sql, function(err, address, fields){
      if(err){ console.log(err);}
      res.render('smartcontract', {contract_address:address[0], result:result});
    });

  });
});

//스마트컨트랙트 배포  //스마트컨트랙트 작동 abi 및 주소값 컨트랙트로 값 설정
app.post(['/memo/contract/:account'], function(req,res)
{
  var account = req.params.account;
  //계좌번호 얻기
  web3.eth.getAccounts(function(err,accounts){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
    let source = fs.readFileSync("./contracts/HelloWorld.sol", 'utf8');
    console.log('compiling contract .....');

    let compiledContract = solc.compile(source);
    console.log('done');

    for (let contractName in compiledContract.contracts) {
        // console.log(contractName + ': ' + compiledContract.contracts[contractName].bytecode);
        // console.log(contractName + '; ' + JSON.parse(compiledContract.contracts[contractName].interface));
        var bytecode = compiledContract.contracts[contractName].bytecode;
        var abi = JSON.parse(compiledContract.contracts[contractName].interface);
        console.log(JSON.stringify(abi, undefined, 2));
    }
    var argHex = web3.utils.asciiToHex("hey");
    var address = accounts[0];

    //promise에 대한 공부.. estimateGas관련 개발
    var gasEstimate = '';
    web3.eth.estimateGas({to:address,data:'0x' + bytecode}, function(err,res){
        //
    });
    //Contract 계약 주소..
    let MyContract = new web3.eth.Contract(abi);
    console.log('deploying contract...' + MyContract.options.address);
    //deploy
    var delplyContractTx = MyContract.deploy({
      data: bytecode,
      arguments:[argHex]
    })
    .send({
      from: address,
      gas: 4000000,   //가스?
      gasPrice: '30000000000000',//가스가격
    })
    .then((instance) => {
      var address = instance.options.address;
      console.log(`Address: ${instance.options.address}`);
      //스마트 컨트랙트
      var sql = 'INSERT INTO smartcontract (s_address) VALUES (?)';
      conn.query(sql, [address], function(err, result, fields){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');
        }
        //계좌정보를 set한다
        var sql = 'SELECT s_address FROM smartcontract WHERE id = 1';
        conn.query(sql, function(err, address, fields){
          if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
          }
        });
        res.render('smartcontract', {address:accounts[0], contract_address:address});
      });
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

//post
app.post('/memo/save', function(req, res){
  console.log('save');
  res.redirect('/memo/blockchain');
});

//app을 listen
app.listen(4000, function(){
  console.log('Connected memo, 4000 port!');
});
