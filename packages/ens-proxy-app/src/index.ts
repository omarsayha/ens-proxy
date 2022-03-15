import {
  SafeEns,
  OwnableEnsProxyFactory,
  OwnableEnsProxyCreatedEvent,
  OwnableEnsProxyFactoryJson,
  PUBLIC_ENS_PROXY_ADDRESS,
  OWNABLE_ENS_PROXY_FACTORY_ADDRESS,
} from "ens-proxy-sdk";
import { Contract, ethers, Signer, Wallet } from "ethers";

import {
  EthNetwork,
  getNetworkPrivateKey,
  getProvider,
} from "./util/constants";

async function main(): Promise<void> {
  const network = EthNetwork.RINKEBY;

  // Use public ens to send eth to omarsayha.eth
  const provider = new ethers.providers.JsonRpcProvider(getProvider(network));

  const signer = getSigner(provider, network);

  const publicSafeEns = new SafeEns(PUBLIC_ENS_PROXY_ADDRESS, signer);
  const publicSendEthTx = await publicSafeEns.sendEth(
    "omarsayha.eth",
    "100000000000000000"
  );
  await publicSendEthTx.wait();

  // Create your own ownable ens proxy
  const ownableEnsProxyFactory = new Contract(
    OWNABLE_ENS_PROXY_FACTORY_ADDRESS,
    OwnableEnsProxyFactoryJson.abi,
    signer
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
    "100000000000000000"
  );
  await ownableSendEthTx.wait();
}

function getSigner(provider: any, network: EthNetwork): Signer {
  return new Wallet(getNetworkPrivateKey(network), provider);
}

main();
