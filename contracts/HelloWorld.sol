pragma solidity ^0.4.8;

contract HelloWolrd {
    bytes32 message;
    function HelloWolrd(bytes32 myMessage){
      message = myMessage;
    }
    function getMessage() returns(bytes32) {
        return message;
    }
}
