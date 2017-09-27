require('babel-polyfill');
const uuidV4 = require('uuid/v4');

let InvitationRepository = artifacts.require("./InvitationRepository.sol");

contract('InvitationRepository', function(accounts) {
  var owner = accounts[0];
  var non_owner = accounts[1];
  // contract addresses can be anything for these examples so using random account address.
  var contract_address = accounts[2];
  var non_contract_address = accounts[3];
  describe('Add', function(){
    it("non owner cannot add", async function() {
      let invitation_code =  web3.fromUtf8('1234567890');
      let instance = await InvitationRepository.new()
      let encrypted_code = await instance.encrypt.call(invitation_code, contract_address);
      await instance.add(encrypted_code, {from:non_owner}).catch(function(){});
      let result = await instance.verify.call(invitation_code, contract_address);
      assert.equal(result, false);
    });

    it("can add multiple", async function(){
      let instance = await InvitationRepository.new();
      var uuids = [];
      for (var i = 0; i < 10; i++) {
        uuids.push(uuidV4());
      }
      var encryptions = []
      for (var i = 0; i < uuids.length; i++) {
        var encrypted = await instance.encrypt.call(uuids[i], contract_address);
        encryptions.push(encrypted);
      }
      await instance.addMultiple(encryptions, {from:owner});
      for (var i = 0; i < uuids.length; i++) {
        var result = await instance.verify.call(uuids[i], contract_address);
        assert.equal(result, true);
      }
    })
  })

  describe('Verify', function(){
    it("can verify", async function() {
      let invitation_code = web3.fromUtf8('1234567890');
      let instance = await InvitationRepository.new()
      let encrypted_code = await instance.encrypt.call(invitation_code, contract_address);
      await instance.add(encrypted_code, {from:owner});
      await instance.add('other_code', {from:owner});
      let result = await instance.verify.call(invitation_code, contract_address);
      assert.equal(result, true);
    });

    it("cannot verify for different contract", async function() {
      let invitation_code = web3.fromUtf8('1234567890');
      let instance = await InvitationRepository.new()
      let encrypted_code = await instance.encrypt.call(invitation_code, contract_address);
      await instance.add(encrypted_code, {from:owner});
      await instance.add('other_code', {from:owner});
      let result = await instance.verify.call(invitation_code, non_contract_address);
      assert.equal(result, false);
    });
  })

  describe('Claim', function(){
    let invited_person = accounts[2];
    let not_invited_person = accounts[3];

    it("non owner cannot claim", async function() {
      let invitation_code =  web3.fromUtf8('1234567890');
      let instance = await InvitationRepository.new()
      let encrypted_code = await instance.encrypt.call(invitation_code, contract_address);
      await instance.add(encrypted_code, {from:owner})
      await instance.claim(invitation_code, contract_address, {from:invited_person}).catch(function(){});
      let result = await instance.report.call(invitation_code, contract_address);
      assert.notEqual(result, invited_person);
    });

    it("can claim", async function() {
      let invitation_code = web3.fromUtf8('1234567890');
      let instance = await InvitationRepository.new()
      let encrypted_code = await instance.encrypt.call(invitation_code, contract_address);
      await instance.add(encrypted_code, {from:owner});
      await instance.claim(invitation_code, invited_person, contract_address, {from:owner});
      let result = await instance.report.call(invitation_code, contract_address);
      assert.equal(result, invited_person);
    });

    it("cannot claim multiple times", async function() {
      let invitation_code = web3.fromUtf8('1234567890');
      let instance = await InvitationRepository.new()
      let encrypted_code = await instance.encrypt.call(invitation_code, contract_address);
      await instance.add(encrypted_code, {from:owner});
      await instance.claim(invitation_code, invited_person, contract_address, {from:owner});
      await instance.claim(invitation_code, not_invited_person, contract_address, {from:owner}).catch(function(){});
      let result = await instance.report.call(invitation_code, contract_address);
      assert.equal(result, invited_person);
    });

    it("cannot claim for different contract", async function() {
      let invitation_code = web3.fromUtf8('1234567890');
      let instance = await InvitationRepository.new()
      let encrypted_code = await instance.encrypt.call(invitation_code, contract_address);
      await instance.add(encrypted_code, {from:owner});
      await instance.claim(invitation_code, invited_person, non_contract_address, {from:owner}).catch(function(){});
      let result = await instance.report.call(invitation_code, contract_address);
      assert.equal(result, false);
    });
  })

  describe('Shared code example', function(){
    it.only("can claim", async function() {
      let first_participant = accounts[4];
      let second_participant = accounts[5];
      let first_salt = '1';
      let second_salt = '2';
      let shared_code = web3.fromUtf8('somecomplexstring');
      let instance = await InvitationRepository.new()
      // Encrypt code twice for each user.
      let first_hashed_code = web3.sha3(first_salt, shared_code);
      let second_hashed_code = web3.sha3(second_salt, shared_code);
      let first_encrypted_code = await instance.encrypt.call(first_hashed_code, contract_address);
      let second_encrypted_code = await instance.encrypt.call(second_hashed_code, contract_address);
      // Add the dobule Encrypt code into an invitation smart contract.
      await instance.add(first_encrypted_code, {from:owner});
      await instance.add(second_encrypted_code, {from:owner});
      // Give the salt to each user when they register.
      let first_participant_salt = first_salt;
      let second_participant_salt = second_salt;
      // Users come to the event.
      // Announce the salt to each user.
      // Each user hash the code with the given salt
      let first_participant_salt_with_shared_code = web3.sha3(first_participant_salt, shared_code);
      let second_participant_salt_with_shared_code = web3.sha3(second_participant_salt, shared_code);
      // BlockParty contract checks
      await instance.claim(first_participant_salt_with_shared_code, first_participant, contract_address, {from:owner});
      await instance.claim(second_participant_salt_with_shared_code, second_participant, contract_address, {from:owner});
      assert.equal((await instance.report.call(first_participant, contract_address)), first_participant);
      assert.equal((await instance.report.call(second_participant, contract_address)), second_participant);
    });
  })
});
