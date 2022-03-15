import { config as dotenvConfig } from "dotenv";
import { notNull } from "./typeAssertions";

export enum EthNetwork {
  MAINNET = "mainnet",
  ROPSTEN = "ropsten",
  RINKEBY = "rinkeby",
  GOERLI = "goerli",
  KOVAN = "kovan",
  HARDHAT = "hardhat",
}

dotenvConfig();

const {
  GOERLI_ALCHEMY_URL,
  RINKEBY_ALCHEMY_URL,
  ROPSTEN_ALCHEMY_URL,
  MAINNET_ALCHEMY_URL,
  TESTNET_PRIVATE_KEY,
  MAINNET_PRIVATE_KEY,
} = process.env;

export const IS_PROD = process.env.NODE_ENV === "production";

export function getNetworkPrivateKey(network: EthNetwork): string {
  switch (network) {
    case EthNetwork.GOERLI:
    case EthNetwork.ROPSTEN:
    case EthNetwork.RINKEBY:
      return notNull(TESTNET_PRIVATE_KEY);
    case EthNetwork.MAINNET:
      return notNull(MAINNET_PRIVATE_KEY);
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

export function getProvider(network: EthNetwork): string {
  switch (network) {
    case EthNetwork.HARDHAT:
      return "http://127.0.0.1:8545/";
    case EthNetwork.GOERLI:
      return notNull(GOERLI_ALCHEMY_URL);
    case EthNetwork.ROPSTEN:
      return notNull(ROPSTEN_ALCHEMY_URL);
    case EthNetwork.RINKEBY:
      return notNull(RINKEBY_ALCHEMY_URL);
    case EthNetwork.MAINNET:
      return notNull(MAINNET_ALCHEMY_URL);
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}
