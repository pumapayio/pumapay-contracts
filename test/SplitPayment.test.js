const {transferETH, transferTokens} = require('./helpers/transferHelper');
const {assertRevert} = require('./helpers/assertionHelper');
const {shouldBeEqualBigNumbers} = require('./helpers/comparisonHelper');
const {splitPaymentErrors} = require('./helpers/errorHelpers');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const SplitPayment = artifacts.require('SplitPayment');
const PMAToken = artifacts.require('MockMintableToken');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MINTED_TOKENS = web3.utils.toWei('1000000000', 'ether'); // 1 Billion PMA

contract('Split Payment Smart Contract', async (accounts) => {
  const deployerAccount = accounts[ 0 ];
  const tokenHolder = accounts[ 1 ];
  const notAReceiverAddress = accounts[ 9 ];

  const receivers = [ accounts[ 2 ], accounts[ 3 ], accounts[ 4 ], accounts[ 5 ] ];
  const percentages = [ 10, 20, 30, 40 ];

  let token;
  let splitPayment;

  const assertSplitPaymentDetails = (details, amount = 0) => {
    assert.equal(details._receivers.length, receivers.length);
    assert.equal(details._percentages.length, percentages.length);
    assert.equal(details._amounts.length, percentages.length);

    for (let [ index, receiver ] of receivers.entries()) {
      assert.equal(details._receivers[ index ], receiver);
      assert.equal(details._percentages[ index ], percentages[ index ]);

      if (amount > 0) {
        shouldBeEqualBigNumbers(
          String(details._amounts[ index ]),
          web3.utils.toWei(String(amount * percentages[ index ] / 100), 'ether')
        );
      } else {
        shouldBeEqualBigNumbers(String(details._amounts[ index ]), 0);
      }
    }
  };

  const assertSplitPaymentDetailsByAddress = (receiverIndex, details, amount = 0) => {
    assert.equal(details._receiver, receivers[ receiverIndex ]);
    assert.equal(details._percentage, percentages[ receiverIndex ]);

    if (amount > 0) {
      shouldBeEqualBigNumbers(
        String(details._amount),
        web3.utils.toWei(String(amount * percentages[ receiverIndex ] / 100), 'ether')
      );
    } else {
      shouldBeEqualBigNumbers(String(details._amount), 0);
    }
  };

  beforeEach('Deploying new Token', async () => {
    token = await PMAToken.new();
  });

  beforeEach('Issue tokens', async () => {
    await token.mint(tokenHolder, MINTED_TOKENS, {
      from: deployerAccount
    });
  });

  beforeEach('Deploying new Split Payment', async () => {
    splitPayment = await SplitPayment.new(
      token.address,
      receivers,
      percentages,
      {
        from: deployerAccount
      });
  });

  describe('Deploying', async () => {
    it('Split Payment token should be the address that was specified on contract deployment', async () => {
      const tokenAddress = await splitPayment.token();

      assert.equal(tokenAddress.toString(), token.address);
    });

    it('Split Payment receivers should be the addresses that were specified on contract deployment', async () => {
      for (let [ index, receiver ] of receivers.entries()) {
        const receiverAddress = await splitPayment.receivers(index);

        assert.equal(receiverAddress.toString(), receiver);
      }
    });

    it('Split Payment percentages should be the numbers specified on contract deployment', async () => {
      for (let [ index, percentage ] of percentages.entries()) {
        const scPercentage = await splitPayment.percentages(index);

        assert.equal(scPercentage.toString(), percentage);
      }
    });

    it('should fail if the token address is a ZERO_ADDRESS', async () => {
      await assertRevert(SplitPayment.new(
        ZERO_ADDRESS,
        receivers,
        percentages,
        {
          from: deployerAccount
        }),
        splitPaymentErrors.zeroAddress
      );
    });

    it('should fail if one of the receiver address is a ZERO_ADDRESS', async () => {
      const wrongReceivers = [ accounts[ 2 ], accounts[ 3 ], accounts[ 4 ], ZERO_ADDRESS ];
      await assertRevert(SplitPayment.new(
        token.address,
        wrongReceivers,
        percentages,
        {
          from: deployerAccount
        }),
        splitPaymentErrors.zeroAddress
      );
    });

    it('should fail if the receivers is an empty array', async () => {
      await assertRevert(SplitPayment.new(
        token.address,
        [],
        percentages,
        {
          from: deployerAccount
        }),
        splitPaymentErrors.noAddresses
      );
    });

    it('should fail if one of the percentages is ZERO', async () => {
      const wrongPercentages = [ 10, 20, 0, 70 ];
      await assertRevert(SplitPayment.new(
        token.address,
        receivers,
        wrongPercentages,
        {
          from: deployerAccount
        }),
        splitPaymentErrors.zeroPercentage
      );
    });

    it('should fail if the percentages is an empty array', async () => {
      await assertRevert(SplitPayment.new(
        token.address,
        receivers,
        [],
        {
          from: deployerAccount
        }),
        splitPaymentErrors.noPercentages
      );
    });

    it('should fail if the percentages do not sum up to 100', async () => {
      const wrongPercentages = [ 10, 20, 30, 69 ]; // not matching up to 100 // sum = 99
      await assertRevert(SplitPayment.new(
        token.address,
        receivers,
        wrongPercentages,
        {
          from: deployerAccount
        }),
        splitPaymentErrors.percentageSumMismatch
      );
    });

    it('should fail if there is a mismatch between receivers and percentages', async () => {
      const wrongPercentages = [ 10, 20, 30, 40 ]; // 4 percentages
      const wrongReceivers = [ accounts[ 2 ], accounts[ 3 ], accounts[ 4 ] ]; // 3 receicers
      await assertRevert(SplitPayment.new(
        token.address,
        wrongReceivers,
        wrongPercentages,
        {
          from: deployerAccount
        }),
        splitPaymentErrors.addressPercentageMismatch
      );
    });
  });

  describe('Split ETH', async () => {
    it('should split ETH received by the smart contract', async () => {
      const ethAmount = 1;
      const beforeBalances = [];

      for (let receiver of receivers) {
        beforeBalances.push(await web3.eth.getBalance(receiver));
      }
      await transferETH(ethAmount, tokenHolder, splitPayment.address);

      for (let [ index, receiver ] of receivers.entries()) {
        const afterBalance = await web3.eth.getBalance(receiver);

        shouldBeEqualBigNumbers(
          String(web3.utils.toBN(afterBalance).sub(web3.utils.toBN(beforeBalances[ index ]))),
          web3.utils.toWei(String(ethAmount * percentages[ index ] / 100), 'ether')
        );
      }
    });

    it('should revert if no ETH are sent', async () => {
      await assertRevert(
        transferETH(0, tokenHolder, splitPayment.address),
        splitPaymentErrors.zeroNumber
      );
    });

    it('should emit events for receiving ETH and for splitting ETH', async () => {
      const ethAmount = 1;
      const b = await transferETH(ethAmount, tokenHolder, splitPayment.address);
      // one event per receiver + one event that ETH were received
      assert.equal(b.logs.length, receivers.length + 1);
    });

    it('should emit a "LogReceivedEth" event when ETH are received', async () => {
      const ethAmount = 1;
      const tx = await transferETH(ethAmount, tokenHolder, splitPayment.address);
      const ethTransferredTopic = tx.logs[ 0 ].topics[ 0 ];

      const expectedTopic = web3.eth.abi.encodeEventSignature({
        name: 'LogReceivedEth',
        type: 'event',
        inputs: [ {
          type: 'address',
          name: 'sender'
        },
          {
            type: 'uint256',
            name: 'amount'
          } ]
      });

      assert.equal(ethTransferredTopic, expectedTopic);
    });

    it('should emit a "LogSplitPaymentEth" event when ETH are split', async () => {
      const ethAmount = 1;
      const tx = await transferETH(ethAmount, tokenHolder, splitPayment.address);
      const ethTransferredTopic = tx.logs[ 1 ].topics[ 0 ];

      const expectedTopic = web3.eth.abi.encodeEventSignature({
        name: 'LogSplitPaymentEth',
        type: 'event',
        inputs: [ {
          type: 'address',
          name: 'receiver'
        },
          {
            type: 'uint256',
            name: 'amount'
          } ]
      });

      assert.equal(ethTransferredTopic, expectedTopic);
    });
  });

  describe('Split PMA', async () => {
    it('should split ETH received by the smart contract', async () => {
      const pmaAmount = 100;
      await transferTokens(token, pmaAmount, tokenHolder, splitPayment.address);

      await splitPayment.executeSplitPayment({
        from: deployerAccount
      });

      for (let [ index, receiver ] of receivers.entries()) {
        const balance = await token.balanceOf(receiver);

        shouldBeEqualBigNumbers(
          String(balance),
          web3.utils.toWei(String(pmaAmount * percentages[ index ] / 100), 'ether')
        );
      }
    });

    it('should fail if there are no ERC20 tokens stored in the smart contract', async () => {
      await assertRevert(splitPayment.executeSplitPayment({
          from: deployerAccount
        }),
        splitPaymentErrors.noFunds
      );
    });

    it('should emit a "LogSplitPaymentERC20" event when splitting ERC20 tokens', async () => {
      const pmaAmount = 100;
      await transferTokens(token, pmaAmount, tokenHolder, splitPayment.address);

      const tx = await splitPayment.executeSplitPayment({
        from: deployerAccount
      });

      assert.equal(tx.logs.length, receivers.length);

      for (let [ index, receiver ] of receivers.entries()) {
        const balance = await token.balanceOf(receiver);

        shouldBeEqualBigNumbers(
          String(balance),
          web3.utils.toWei(String(pmaAmount * percentages[ index ] / 100), 'ether')
        );
        assert.equal(tx.logs[ index ].event, 'LogSplitPaymentERC20');
        assert.equal(tx.logs[ index ].args.receiver, receiver);
      }
    });
  });

  describe('Getter functions', async () => {
    it('should return the details of the split payment', async () => {
      const pmaAmount = 100;
      await transferTokens(token, pmaAmount, tokenHolder, splitPayment.address);
      const details = await splitPayment.getSplitPaymentDetails();

      assertSplitPaymentDetails(details, pmaAmount);
    });

    it('should return the details of the split payment with amount 0 when there are no tokens', async () => {
      const details = await splitPayment.getSplitPaymentDetails();

      assertSplitPaymentDetails(details);
    });

    it('should return the details of a specific address of the split payment', async () => {
      const pmaAmount = 100;
      await transferTokens(token, pmaAmount, tokenHolder, splitPayment.address);

      for (let [ index, receiver ] of receivers.entries()) {
        const details = await splitPayment.getSplitPaymentDetailsByAddress(receivers[ index ]);

        assertSplitPaymentDetailsByAddress(index, details, pmaAmount);
      }
    });

    it('should return the details of a specific address with amount 0 when there are no tokens', async () => {
      for (let [ index, receiver ] of receivers.entries()) {
        const details = await splitPayment.getSplitPaymentDetailsByAddress(receivers[ index ]);

        assertSplitPaymentDetailsByAddress(index, details);
      }
    });

    it('should return the zero when the querying address is not a receiver', async () => {
      const details = await splitPayment.getSplitPaymentDetailsByAddress(notAReceiverAddress);

      assert.equal(details._receiver, 0);
      assert.equal(details._percentage, 0);
      shouldBeEqualBigNumbers(String(details._amount), 0);
    })
  });
});
