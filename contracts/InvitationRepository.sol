pragma solidity ^0.4.11;

import './zeppelin/ownership/Ownable.sol';

contract InvitationRepository is Ownable{
  bytes32 encryptedCode;

  struct Code{
    bool exist;
    bool claimed;
    address participant;
  }

  mapping(bytes32 => Code) codes;

  event LogEvent(string event_type, bytes32 code);

  function add(bytes32 _encryptedInvitationCode) onlyOwner{
    codes[_encryptedInvitationCode] = Code(true, false, 0);
  }

  function addMultiple(bytes32[] _encryptedInvitationCodes) onlyOwner{
    for(uint i=0;i<_encryptedInvitationCodes.length;i++){
      add(_encryptedInvitationCodes[i]);
    }
  }

  function claim(bytes32 _code, address _sender, address contractAddress) returns(bool){
    var code = codes[encrypt(_code, contractAddress)];
    if(code.exist && !code.claimed){
      code.claimed = true;
      code.participant = _sender;
    }else{
      revert();
    }
    return true;
  }

  function encrypt(bytes32 _code, address contractAddress) constant returns(bytes32){
    return sha3(_code, contractAddress);
  }

  function verify(bytes32 _code, address contractAddress) constant returns(bool){
    return codes[encrypt(_code, contractAddress)].exist;
  }

  function report(bytes32 _code, address contractAddress) constant returns(address){
    return codes[encrypt(_code, contractAddress)].participant;
  }
}
