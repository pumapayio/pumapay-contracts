# Split Payment - Specifications

## Introduction

The Split Payment is a payment utility that complements our pull payment protocol and 
allows for a payment to be split between multiple addresses. 

## Use Case

A very good example of the split payment is Affiliation programs. In affiliation programs, 
the person who refers a customer (referrer) receives a percentage of the payment that the customer 
has made. In this case, the business (receiver_1) will create a split payment between them and 
the referrer (receiver_2) based on an agreed percentage i.e. 15%. 

## Scope

`SplitPayment.sol` - it includes the `IERC20.sol` and the `SafeMath.sol` contracts from [open-zeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts)

## Definition 
The split payment contract splits funds to different addresses. 
The split happens on a percentage base and it facilitates both ETH and ERC20 tokens.

For ETH the split happens once the ETH are sent to the smart contract using the fallback method.

For ERC20, the tokens are held by the smart contract and the split needs to be triggered using the `executeSplitPayment()`.
When the `executeSplitPayment()` is triggered, all the held tokens are split to the receivers based on the percentages
specified on contract deployment.

## How to use

### Deployment
On contract deployment, we need to define:
1. The `address` of the ERC20 token - `_token`
2. Array of `addresses` that will be the receivers of the split payment - `_receivers`
3. Array of `uint256` that will be the percentages for the split payments - `_percentages`

**_NOTE: Check [`SplitPaymentFactory.sol`](../contracts/SplitPaymentFactory.sol) for easier deployment._**

### Splitting ETH
We allow the smart contract to receive ETH by using the `function() payable`. 

The fallback function goes through the array of addresses specified on deployment of the smart contract and splits the ETH 
to the addresses based on the percentages specified during deployment.

### Splitting ERC20
For splitting ERC20 tokens, first the payee needs to send the tokens to the smart contract. 

By using the `executeSplitPayment()`, which is an `external` function, anyone can trigger the split 
of the ERC20 tokens. On execution of the split payment, we are checking if the smart contract holds 
ERC20 tokens, and we are transferring all of them to the `receivers` based on the `percentages` specified
on deployment. 
