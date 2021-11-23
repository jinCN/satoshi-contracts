// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

interface IOwnable {
  function manager() external view returns (address);

  function renounceManagement() external;

  function pushManagement(address newOwner_) external;

  function pullManagement() external;
}
