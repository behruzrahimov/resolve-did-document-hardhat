// SPDX-License-Identifier: unlicensed

pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";
import "hardhat/console.sol";

/// @title Anchors the DidHash with their corresponding didDocHash
/// @author Rumsan Team
/// @dev Inherits AccessControl and Multicall from openzeppelin,
/// AccessControl to manage multiple roles in contract
/// Multicall to make bulk calls to a contract
// Uncomment this line to use console.log

contract AnchorContract is AccessControl, ERC2771Context, Multicall {
    /// @dev event to be emitted when did is anchored
    /// @param didHash keccak256 hash of the did to be anchored
    /// @param didDocHash keccak256 hash of the didDoc to be anchored
    /// @param operation did anchor operations: 0 = createDid, 1 = UpdateDid, 2 = deleteDid
    event DidAnchored(bytes32 didHash, bytes32 didDocHash, uint256 operation);

    using EnumerableSet for EnumerableSet.Bytes32Set;

    /// @dev version of the contract just to keep track if contract is updated
    string public version;

    /// @dev Member_Role id for the AccessControl Contract
    bytes32 public constant MEMBER_ROLE = keccak256("MEMBER_ROLE");

    /// @dev list of anchored did
    EnumerableSet.Bytes32Set private didHashSet;

    /// @dev mapping from didHash to didDocHash
    mapping(bytes32 => bytes32) public dids;

    /// @dev Set the admins and the members roles during deployment
    /// @param _admins list of admins addresses
    /// @param _members list of itn members addresses
    /// @param _forwarder trusted tx-forwarder contract
    /// @param _version version of the contract - just to keep track if contract is updated
    constructor(
        address[] memory _admins,
        address[] memory _members,
        MinimalForwarder _forwarder,
        string memory _version
    ) ERC2771Context(address(_forwarder)) {
        version = _version;
        _setRoleAdmin(MEMBER_ROLE, DEFAULT_ADMIN_ROLE);
        for (uint256 i = 0; i < _admins.length; i++) {
            _setupRole(DEFAULT_ADMIN_ROLE, _admins[i]);
        }
        for (uint256 i = 0; i < _members.length; i++) {
            _setupRole(MEMBER_ROLE, _members[i]);
        }
    }

    /// @dev Checks if the caller is registered as a member or not
    modifier OnlyMember() {
        require(
            hasRole(MEMBER_ROLE, _msgSender()),
            "Only Registered Members can execute this function"
        );
        _;
    }

    /// @dev overriding the method to ERC2771Context
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        sender = ERC2771Context._msgSender();
    }

    /// @dev overriding the method to ERC2771Context
    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    /// @dev it checks if the didhash was ever anchored in the contract or not
    /// @param _didHash keccak256 hash of the did string
    /// @return bool value based as did anchored in this contract or not
    function didExists(bytes32 _didHash) public view returns (bool) {
        return didHashSet.contains(_didHash);
    }

    /// @dev Anchors the didHash and didDocHash in the contract,
    /// Adds DidHash to the set and maps the didHash to didDocHash
    /// Method is only accesible by the registered members
    /// emits the DidAnchored event based on operations(add,update,delete) performed
    /// @param _didHash keccak256 hash of the did string
    /// @param _didDocumentHash keccack256 hash of the DID document (a JSON-LD object)
    function anchorDID(bytes32 _didHash, bytes32 _didDocumentHash)
        external
        OnlyMember
    {
        uint256 operation;
        if (!didExists(_didHash)) operation = 0; //New did anchored
        if (didExists(_didHash)) operation = 1; //update existing did
        if (_didDocumentHash == bytes32(0)) operation = 2; // delete the did
        didHashSet.add(_didHash);
        dids[_didHash] = _didDocumentHash;
        emit DidAnchored(_didHash, _didDocumentHash, operation);
    }
}
