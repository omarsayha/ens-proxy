import { exec } from "child_process";
import { config as dotenvConfig } from "dotenv";
import { task, HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import { deployAndVerify, verify } from "./tasks/deploys";
import { develop } from "./tasks/develop";
import { notNull } from "./tasks/util/typeAssertions";

dotenvConfig();

// This is a sample Hardhat task. To learn how to create your zown go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("deploy-ens-proxy", "Deploys this contract.", (_, hre) =>
  deployAndVerify(hre)
);

task("verify-ens-proxy", "Verifies the contract on Etherscan.")
  .addPositionalParam(
    "address",
    "Address of the contract to verify.",
    undefined,
    undefined,
    false
  )
  .setAction((taskArgs, hre) => verify(taskArgs.address, hre));

task(
  "develop",
  "Runs a development chain and deploys the contract to it.",
  async (_, hre) => {
    hre.run("node");
    await develop(hre);
  }
);

// Extend the compile task to copy artifacts to dependents.
task("compile").setAction(async (_, __, runSuper) => {
  await runSuper();
  exec("scripts/copy-artifacts-to-dependents.sh");
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const {
  ETHERSCAN_API_KEY,
  GOERLI_ALCHEMY_URL,
  ROPSTEN_ALCHEMY_URL,
  MAINNET_ALCHEMY_URL,
  RINKEBY_ALCHEMY_URL,
  MAINNET_PRIVATE_KEY,
  TESTNET_PRIVATE_KEY,
} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    goerli: {
      url: GOERLI_ALCHEMY_URL,
      accounts: [notNull(TESTNET_PRIVATE_KEY)],
    },
    rinkeby: {
      url: RINKEBY_ALCHEMY_URL,
      accounts: [notNull(TESTNET_PRIVATE_KEY)],
    },
    ropsten: {
      url: ROPSTEN_ALCHEMY_URL,
      accounts: [notNull(TESTNET_PRIVATE_KEY)],
    },
    mainnet: {
      url: MAINNET_ALCHEMY_URL,
      accounts: [notNull(MAINNET_PRIVATE_KEY)],
    },
    hardhat: {
      forking: {
        url: MAINNET_ALCHEMY_URL ?? "",
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: "USD",
  },
  etherscan: { apiKey: ETHERSCAN_API_KEY },
};
export default config;
