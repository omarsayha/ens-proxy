# ENS Proxy SDK

Ethers client extended with on-chain ENS resolution using either a PublicEnsProxy
or OwnableEnsProxy, depending on your use case.

## Introduction

When resolving ENS names, you probably make a call to the ENS registry/resolver
to get an address and then you execute a transaction using that address. Although
uncommon, this makes you vulnerable to MITM (man in the middle) attacks,
deep reorgs or any other possible attack vectors that lead to a dirty read. With
the ENS proxy SDK, you can be confident that any interaction with,
say "omarsayha.eth", is in fact directed to the owner of "omarsayha.eth".

There are two types of contracts that you can use to make this interaction, both
with the same interface but different privileges:

PublicEnsProxy:

- This contract is accessible by anyone. As such, you should NOT give this
  contract any privileges. For example, you should NOT approve() ownership
  to transfer an ERC20 token. Some great example use cases are sending ETH to
  "omarsayha.eth" or using approveAndCall() to transfer ERC20 tokens to an
  [ERC1363](https://eips.ethereum.org/EIPS/eip-1363) compliant token
- The PublicEnsProxy is deployed at [0x4f8e7696E846E24914a32c7b1f090D91b51aaA0B](https://etherscan.io/address/0x4f8e7696E846E24914a32c7b1f090D91b51aaA0B#code).
  This same address is used across Mainnet, Ropsten, Rinkeby and Goerli.

OwnableEnsProxy:

- This contract is accessible by only the owner, using OpenZepplin's [Ownable](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol). To create your own ownable ens proxy, using the
  OwnableEnsProxyFactory.
- The OwnableEnsProxyFactory is deployed at [0xE254C5cd48206F07009Ed1C7837565707B317F15](https://etherscan.io/address/0xE254C5cd48206F07009Ed1C7837565707B317F15#code).
  This same address is used across Mainnet, Ropsten, Rinkeby and Goerli.

## Installation

### With a package manager

With Yarn:

```
yarn add @ens-proxy-sdk
```

Or with NPM:

```
npm install @ens-proxy-sdk
```

## Usage

### Basic Usage

Example of using PublicEnsProxy:

```ts
import { SafeEns, PUBLIC_ENS_PROXY_ADDRESS } from "ens-proxy-sdk";
import { ethers } from "ethers";

const signer = ethers.provider.getSigner();

// Use public ens to send eth to omarsayha.eth
const publicSafeEns = new SafeEns(PUBLIC_ENS_PROXY_ADDRESS, signer);
const publicSendEthTx = await publicSafeEns.sendEth(
  "omarsayha.eth",
  "100000000000000000", // NOTE: units are in wei
);
await publicSendEthTx.wait();
```

Example of using your own OwnableEnsProxy:

```ts
import {
  SafeEns,
  OwnableEnsProxyFactory,
  OwnableEnsProxyCreatedEvent,
  OwnableEnsProxyFactoryJson,
  OWNABLE_ENS_PROXY_FACTORY_ADDRESS,
} from "ens-proxy-sdk";
import { ethers } from "ethers";
const signer = ethers.provider.getSigner();
// Create your own ownable ens proxy
const ownableEnsProxyFactory = new Contract(
  OWNABLE_ENS_PROXY_FACTORY_ADDRESS,
  OwnableEnsProxyFactoryJson.abi,
  signer,
) as OwnableEnsProxyFactory;
await ownableEnsProxyFactory.deployed();
const createEnsProxyTx = await ownableEnsProxyFactory
  .connect(signer)
  .createEnsProxy();
const createEnsProxyTxReceipt = await createEnsProxyTx.wait();
const { ensProxyAddress } = (
  createEnsProxyTxReceipt.events?.[0] as OwnableEnsProxyCreatedEvent
).args;

// Use the created ownable ens proxy to send eth
const ownableSafeEns = new SafeEns(ensProxyAddress, signer);
const ownableSendEthTx = await ownableSafeEns.sendEth(
  "omarsayha.eth",
  "100000000000000000", // NOTE: units are in wei
);
await ownableSendEthTx.wait();
```
