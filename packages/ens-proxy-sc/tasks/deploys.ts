import { Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { constructorArgs } from "./util/constants";

// TypeScript trick to import module's type extensions without importing module.
(_: typeof import("@nomiclabs/hardhat-ethers")) => 0;

export async function deploy({
  ethers,
}: HardhatRuntimeEnvironment): Promise<Contract> {
  const OwnableEnsProxy = await ethers.getContractFactory("OwnableEnsProxy");
  const ownableEnsProxy = await OwnableEnsProxy.deploy(...constructorArgs);
  return ownableEnsProxy;
}

export function verify(
  address: string,
  { run }: HardhatRuntimeEnvironment
): Promise<void> {
  return run("verify", {
    address: address,
    constructorArgsParams: constructorArgs,
  });
}

export async function deployAndVerify(
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const ownableEnsProxy = await deploy(hre);
  console.log("Ens Proxy deployed to:", ownableEnsProxy.address);
  console.log("Awaiting five confirmations before verifying on Etherscan.");
  await ownableEnsProxy.deployTransaction.wait(5);
  console.log("Done waiting for confirmations. Verifying.");
  await verify(ownableEnsProxy.address, hre);
  console.log("Verification complete!");
}
