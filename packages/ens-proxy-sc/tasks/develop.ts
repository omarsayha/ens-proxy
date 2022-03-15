import { HardhatRuntimeEnvironment } from "hardhat/types";
import { constructorArgs } from "./util/constants";

// TypeScript trick to import module's type extensions without importing module.
(_: typeof import("@nomiclabs/hardhat-ethers")) => 0;

export async function develop(hre: HardhatRuntimeEnvironment): Promise<void> {
  console.log("Deploying PublicEnsProxy");
  const PublicEnsProxy = await hre.ethers.getContractFactory("PublicEnsProxy");
  const publicEnsProxy = await PublicEnsProxy.deploy(...constructorArgs);
  console.log("PublicEnsProxy deployed to:", publicEnsProxy.address);

  console.log("Deploying MockERC721");
  const mockERC721 = await hre.ethers.getContractFactory("MockERC721");
  const MockERC721 = await mockERC721.deploy();
  console.log("MockERC721 deployed to:", MockERC721.address);
  // Wait forever.
  await new Promise(() => undefined);
}
