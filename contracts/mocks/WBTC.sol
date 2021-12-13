// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "../common/ERC20.sol";

contract WBTC is ERC20("Wrapped BTC", "WBTC", 8) {
  function mint(address _to, uint256 _amount) public returns (bool) {
    _mint(_to, _amount);
    return true;
  }
}
