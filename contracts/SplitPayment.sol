pragma solidity 0.5.16;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title PumaPay Slit Payment
/// @notice Contract that splits any funds that are received to different addresses.
/// The split happens on a percentage base and it facilitates both ETH and ERC20 tokens.
/// For ETH the split happens once the ETH are sent to the smart contract using the fallback method.
/// For ERC20, the tokens are held by the smart contract and the split needs to be triggered using the `executeSplitPayment()`.
/// When the `executeSplitPayment()` is triggered all the held tokens are split to the receivers based on the percentages
/// specified on contract deployment.
/// @author Giorgos Kourtellos - <giorgos@pumapay.io>
contract SplitPayment {

    using SafeMath for uint256;

    // ===============================================================================================================
    // Constants
    // ===============================================================================================================
    uint256 constant private UNITS_IN_HUNDRED_PERCENT = 100;

    // ===============================================================================================================
    // Members
    // ===============================================================================================================
    IERC20 public token;
    address[] public receivers;
    uint256[] public percentages;

    // ===============================================================================================================
    // Modifiers
    // ===============================================================================================================
    /// @notice Checks if the smart contract holds any ERC20 tokens.
    /// Requirement is to hold ERC20 tokens.
    modifier hasTokens() {
        require(token.balanceOf(address(this)) > 0, "SplitPayment::hasTokens - NO_FUNDS");
        _;
    }

    /// @notice Checks the array of addresses.
    /// Requirement is that no address is a zero address.
    modifier validAddressArray(address[] memory _addresses) {
        for (uint i = 0; i < _addresses.length; i++) {
            require(_addresses[i] != address(0), "SplitPayment::validAddressArray - ZERO_ADDRESS");
        }
        _;
    }

    /// @notice Checks the validity of a number.
    /// Requirement is that the number is greater than 0.
    modifier validNumber(uint256 _number){
        require(_number > 0, "SplitPayment::validNumber - ZERO_NUMBER");
        _;
    }

    // ===============================================================================================================
    // Constructor
    // ===============================================================================================================
    /// @notice Contract constructor - sets the token address that the contract facilitates,
    /// the receivers array and the percentages array.
    /// @param _token - Token Address.
    /// @param _receivers - Array of receiver addresses
    /// @param _percentages - Array of percentages
    constructor (
        address _token,
        address[] memory _receivers,
        uint256[] memory _percentages
    )
    public
    validAddressArray(_receivers)
    {
        require(_token != address(0), "SplitPayment::constructor - ZERO_ADDRESS");
        require(_receivers.length > 0, "SplitPayment::constructor - NO_ADDRESSES");
        require(_percentages.length > 0, "SplitPayment::constructor - NO_PERCENTAGES");
        require(_receivers.length == _percentages.length, "SplitPayment::constructor - ADDRESSES_PERCENTAGES_MISMATCH");
        require(checkPercentagesValidity(_percentages), "SplitPayment::constructor - PERCENTAGES_SUM_MISMATCH");

        token = IERC20(_token);
        receivers = _receivers;
        percentages = _percentages;
    }

    /// @notice Logs that the smart contract has received ETH. It specifies the amount of ETH and the sender.
    event LogReceivedEth(address sender, uint256 amount);

    /// @notice Logs that a split payment has happened for ETH. It specifies the receiver and the amount of ETH.
    event LogSplitPaymentEth(address receiver, uint256 amount);

    /// @notice Will receive any ETH sent to the contract.
    /// Once ETH are received, we will distribute them to the receivers based on the
    /// percentage specified on contract deployment.
    // solhint-disable-next-line
    function()
    external
    payable
    validNumber(msg.value)
    {
        emit LogReceivedEth(msg.sender, msg.value);

        for (uint i = 0; i < receivers.length; i++) {
            address payable receiver = address(uint160(receivers[i]));
            uint256 transferAmount = calculateAmountToTransferToReceiver(msg.value, percentages[i]);
            receiver.transfer(transferAmount);

            emit LogSplitPaymentEth(receiver, transferAmount);
        }
    }

    // ===============================================================================================================
    // External
    // ===============================================================================================================
    /// @notice Logs that a split payment has happened for ERC20 tokens. It specifies the receiver and the amount of ERC20 tokens.
    event LogSplitPaymentERC20(address receiver, uint256 amount);

    /// @notice Executes the split payment for the ERC20 token.
    /// We check if the smart contract has ERC20 tokens. If it does, we transfer the tokens based on the
    /// percentages specified on deployment of smart contract
    function executeSplitPayment()
    external
    hasTokens
    {
        uint256 smartContractBalance = token.balanceOf(address(this));
        for (uint i = 0; i < uint(receivers.length); i++) {
            uint256 transferAmount = calculateAmountToTransferToReceiver(smartContractBalance, percentages[i]);
            require(token.transfer(receivers[i], transferAmount), "SplitPayment::executeSplitPayment - FAILED_TRANSFER");

            emit LogSplitPaymentERC20(receivers[i], transferAmount);
        }
    }

    // ===============================================================================================================
    // Private
    // ===============================================================================================================
    /// @notice Checks if the percentages are valid. A valid percentage array should:
    /// 1. Summing up all percentages should be 100
    /// 2. All percentages must be more than 0
    /// @param _percentages - array of percentages to be validated
    /// @return Returns whether or not the percentages are summed up to 100 i.e. 100%
    function checkPercentagesValidity(uint256[] memory _percentages)
    private
    pure
    returns (bool)
    {
        uint256 summedPercentage = 0;
        for (uint i = 0; i < _percentages.length; i++) {
            require(_percentages[i] > 0, "SplitPayment::checkPercentagesValidity - ZERO_PERCENTAGE");
            summedPercentage = summedPercentage + _percentages[i];
        }

        return summedPercentage == UNITS_IN_HUNDRED_PERCENT;
    }

    /// @notice Will calculate amount to be transferred based on the percentage
    /// @param _amount - amount to be split
    /// @param _percentage - percentage of the split
    /// @return Returns the amount of assets that need to be transferred based on the percentage
    function calculateAmountToTransferToReceiver(uint256 _amount, uint256 _percentage)
    private
    pure
    validNumber(_amount)
    validNumber(_percentage)
    returns (uint256)
    {
        return _amount.mul(_percentage).div(UNITS_IN_HUNDRED_PERCENT);
    }

    // ===============================================================================================================
    // Getters
    // ===============================================================================================================
    /// @dev Returns the amount of ERC20 tokens stored in the smart contract
    /// @return Returns array of receiver addresses, the array of percentages and the array of amounts
    function getSplitPaymentDetails()
    external
    view
    returns (address[] memory _receivers, uint256[] memory _percentages, uint256[] memory _amounts)
    {
        uint256[] memory amounts = new uint[](receivers.length);

        uint256 smartContractBalance = token.balanceOf(address(this));
        for (uint i = 0; i < receivers.length; i++) {
            if (smartContractBalance > 0) {
                amounts[i] = calculateAmountToTransferToReceiver(smartContractBalance, percentages[i]);
            } else {
                amounts[i] = 0;
            }
        }

        _receivers = receivers;
        _percentages = percentages;
        _amounts = amounts;
    }

    /// @dev Returns the receivers and the percentage for a specific index
    /// @param receiver - receiver address for which we are querying for the split payment details
    /// @return Returns the receiver address, the percentage and the amount associated with it
    function getSplitPaymentDetailsByAddress(address receiver)
    external
    view
    returns (address _receiver, uint256 _percentage, uint256 _amount)
    {
        uint index = uint(-1);
        for (uint i = 0; i < receivers.length; i++) {
            if (receivers[i] == receiver) {
                index = i;
            }
        }

        if (index == uint(-1)) {
            return (address(0), uint256(0), uint256(0));
        }

        uint256 smartContractBalance = token.balanceOf(address(this));

        _receiver = receiver;
        _percentage = percentages[index];

        if (smartContractBalance > 0) {
            _amount = calculateAmountToTransferToReceiver(smartContractBalance, percentages[index]);
        } else {
            _amount = 0;
        }
    }
}
