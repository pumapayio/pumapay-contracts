pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";

contract MockMintableToken is ERC20Mintable {
    string public name = "PumaPay";
    string public symbol = "PMA";
    uint8 public decimals = 18;
}
