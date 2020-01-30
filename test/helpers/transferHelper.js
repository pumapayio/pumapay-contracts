const transferETH = function (numberOfEthers, fromAccount, toAccount) {
  return web3.eth.sendTransaction(
    {
      from: fromAccount,
      to: toAccount,
      value: web3.utils.toWei(String(numberOfEthers), 'ether')
    }
  );
};

const transferTokens = async function (token, numberOfTokens, fromAccount, toAccount) {
  return await token.transfer(
    toAccount,
    web3.utils.toWei(String(numberOfTokens), 'ether'),
    {
      from: fromAccount
    });
};

module.exports = {
  transferETH,
  transferTokens
};
