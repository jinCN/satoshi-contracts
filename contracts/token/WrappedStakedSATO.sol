// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "../common/ERC20.sol";
import "../interfaces/IStakedSATO.sol";
import "../libraries/Address.sol";
import "../libraries/SafeMath.sol";
import "../libraries/SafeERC20.sol";

contract WrappedStakedSATO is ERC20 {
  using SafeERC20 for ERC20;
  using Address for address;
  using SafeMath for uint256;

  address public immutable xSATO;

  constructor(address _xSATO) ERC20("Wrapped Staked Satoshi", "wxSATO", 18) {
    require(_xSATO != address(0));
    xSATO = _xSATO;
  }

  /**
        @notice wrap xSATO
        @param _amount uint
        @return uint
     */
  function wrap(uint256 _amount) external returns (uint256) {
    IERC20(xSATO).transferFrom(msg.sender, address(this), _amount);

    uint256 value = xSATOTowxSATO(_amount);
    _mint(msg.sender, value);
    return value;
  }

  /**
        @notice unwrap xSATO
        @param _amount uint
        @return uint
     */
  function unwrap(uint256 _amount) external returns (uint256) {
    _burn(msg.sender, _amount);

    uint256 value = wxSATOToxSATO(_amount);
    IERC20(xSATO).transfer(msg.sender, value);
    return value;
  }

  /**
        @notice converts wxSATO amount to xSATO
        @param _amount uint
        @return uint
     */
  function wxSATOToxSATO(uint256 _amount) public view returns (uint256) {
    return _amount.mul(IStakedSATO(xSATO).index()).div(10**decimals());
  }

  /**
        @notice converts xSATO amount to wxSATO
        @param _amount uint
        @return uint
     */
  function xSATOTowxSATO(uint256 _amount) public view returns (uint256) {
    return _amount.mul(10**decimals()).div(IStakedSATO(xSATO).index());
  }
}
