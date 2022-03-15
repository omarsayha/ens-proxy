import { deployMockContract } from "@ethereum-waffle/mock-contract";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { SafeEns, toEnsNode } from "ens-proxy-sdk";
import { MockContract } from "ethereum-waffle";
import { Contract } from "ethers";
import { ethers } from "hardhat";

import ensRegistryJson from "../artifacts/contracts/EnsLibrary.sol/EnsRegistry.json";
import ensResolverJson from "../artifacts/contracts/EnsLibrary.sol/EnsResolver.json";
import mockErc721Json from "../artifacts/contracts/MockERC721.sol/MockERC721.json";
import ownableEnsProxyJson from "../artifacts/contracts/OwnableEnsProxy.sol/OwnableEnsProxy.json";
import ownableEnsProxyFactoryJson from "../artifacts/contracts/OwnableEnsProxyFactory.sol/OwnableEnsProxyFactory.json";
import publicEnsProxyJson from "../artifacts/contracts/PublicEnsProxy.sol/PublicEnsProxy.json";
import { MockERC721 } from "../typechain-types/MockERC721";
import { OwnableEnsProxy } from "../typechain-types/OwnableEnsProxy";
import {
  OwnableEnsProxyCreatedEvent,
  OwnableEnsProxyFactory,
} from "../typechain-types/OwnableEnsProxyFactory";
import { PublicEnsProxy } from "../typechain-types/PublicEnsProxy";

// TypeScript trick to import module's type extensions without importing module.
(_: typeof import("@nomiclabs/hardhat-ethers")) => 0;

use(chaiAsPromised);

describe("OwnableEnsProxy", () => {
  let mockEnsRegistry: MockContract;
  let mockEnsResolver: MockContract;
  let ownableEnsProxy: Contract;
  let mockErc721: Contract;
  let mockErc721Proxy: MockERC721 & {
    baseContract: MockERC721;
  };
  let safeEns: SafeEns;

  beforeEach(async function () {
    const signer = ethers.provider.getSigner();
    mockEnsRegistry = await deployMockContract(signer, ensRegistryJson.abi);
    mockEnsResolver = await deployMockContract(signer, ensResolverJson.abi);
    const ownableEnsProxyFactoryContractFactory = new ethers.ContractFactory(
      ownableEnsProxyFactoryJson.abi,
      ownableEnsProxyFactoryJson.bytecode,
      signer
    );
    const ownableEnsProxyFactory =
      (await ownableEnsProxyFactoryContractFactory.deploy(
        mockEnsRegistry.address
      )) as OwnableEnsProxyFactory;
    await ownableEnsProxyFactory.deployed();
    const tx = await ownableEnsProxyFactory.connect(signer).createEnsProxy();
    const receipt = await tx.wait();
    const { ensProxyAddress } = (
      receipt.events?.[0] as OwnableEnsProxyCreatedEvent
    ).args;
    ownableEnsProxy = new Contract(
      ensProxyAddress,
      ownableEnsProxyJson.abi,
      signer
    ) as OwnableEnsProxy;
    const mockErc721ContractFactory = new ethers.ContractFactory(
      mockErc721Json.abi,
      mockErc721Json.bytecode,
      signer
    );
    mockErc721 = await mockErc721ContractFactory.deploy();
    safeEns = new SafeEns(ownableEnsProxy.address, signer);
    mockErc721Proxy = safeEns.newContract<MockERC721>(
      mockErc721.address,
      mockErc721Json.abi
    );
  });

  async function mockEnsSetup() {
    const ensName = "omarsayha.eth";
    const [, receiver] = await ethers.getSigners();
    const ensNode = toEnsNode(ensName);
    const ensAddress = await receiver.getAddress();
    await mockEnsRegistry.mock.resolver
      .withArgs(ensNode)
      .returns(mockEnsResolver.address);
    await mockEnsRegistry.mock.resolver
      .withArgs(ensNode)
      .returns(mockEnsResolver.address);
    await mockEnsResolver.mock.addr.withArgs(ensNode).returns(ensAddress);
    return { ensName, ensNode, ensAddress };
  }

  it("Signer has ownership of contract created from factory", async () => {
    const signerAddress = await ethers.provider.getSigner().getAddress();
    expect(await ownableEnsProxy.owner()).to.equal(signerAddress);
  });

  it("Resolve address from ens node", async () => {
    const { ensNode, ensAddress } = await mockEnsSetup();
    expect(await ownableEnsProxy.getAddressFromEnsNode(ensNode)).to.be.equal(
      ensAddress
    );
  });

  it("Non-owner can't use ownable contract", async () => {
    const [_, nonOwner] = await ethers.getSigners();
    expect(await ownableEnsProxy.owner()).to.not.be.equal(
      await nonOwner.getAddress()
    );
    const safeEnsNonOwner = new SafeEns(ownableEnsProxy.address, nonOwner);
    const { ensName } = await mockEnsSetup();
    await expect(safeEnsNonOwner.sendEth(ensName, 1)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Owner transfers eth to ens name", async () => {
    const { ensName, ensAddress } = await mockEnsSetup();
    const initialBalance = await ethers.provider.getBalance(ensAddress);
    const ethToSend = 1;
    const tx = await safeEns.sendEth(ensName, ethToSend);
    await tx.wait();
    const finalBalance = await ethers.provider.getBalance(ensAddress);
    expect(finalBalance.eq(initialBalance.add(ethToSend))).to.be.true;
  });

  it("Owner can approve ens proxy to transfer erc721, and transfer erc721 to ens name", async () => {
    const { ensName, ensAddress } = await mockEnsSetup();

    const signerAddress = await ethers.provider.getSigner().getAddress();
    const txMint = await mockErc721Proxy.baseContract.mint(signerAddress);
    const txMintReceipt = await txMint.wait();

    if (txMintReceipt.events) {
      const tokenId = txMintReceipt.events[0].topics[3];
      const initialOwnerOfToken = await mockErc721Proxy.baseContract.ownerOf(
        tokenId
      );
      expect(initialOwnerOfToken).to.be.equal(signerAddress);
      const txApprove = await mockErc721Proxy.baseContract.approve(
        ownableEnsProxy.address,
        tokenId
      );
      await txApprove.wait();
      const txTransfer = await mockErc721Proxy.transferFrom(
        signerAddress,
        ensName,
        tokenId
      );
      await txTransfer.wait();
      const newOwnerOfToken = await mockErc721Proxy.baseContract.ownerOf(
        tokenId
      );
      expect(ensAddress).to.be.equal(newOwnerOfToken);
    } else {
      throw "Mint failed";
    }
  });
});

describe("PublicEnsProxy", () => {
  let mockEnsRegistry: MockContract;
  let mockEnsResolver: MockContract;
  let publicEnsProxy: Contract;

  beforeEach(async function () {
    const signer = ethers.provider.getSigner();
    mockEnsRegistry = await deployMockContract(signer, ensRegistryJson.abi);
    mockEnsResolver = await deployMockContract(signer, ensResolverJson.abi);
    const publicEnsProxyContractFactory = new ethers.ContractFactory(
      publicEnsProxyJson.abi,
      publicEnsProxyJson.bytecode,
      signer
    );
    const publicEnsProxyDeploy = (await publicEnsProxyContractFactory.deploy(
      mockEnsRegistry.address
    )) as PublicEnsProxy;
    await publicEnsProxyDeploy.deployed();
    publicEnsProxy = new Contract(
      publicEnsProxyDeploy.address,
      publicEnsProxyJson.abi,
      signer
    ) as PublicEnsProxy;
  });

  async function mockEnsSetup() {
    const ensName = "omarsayha.eth";
    const [, receiver] = await ethers.getSigners();
    const ensNode = toEnsNode(ensName);
    const ensAddress = await receiver.getAddress();
    await mockEnsRegistry.mock.resolver
      .withArgs(ensNode)
      .returns(mockEnsResolver.address);
    await mockEnsRegistry.mock.resolver
      .withArgs(ensNode)
      .returns(mockEnsResolver.address);
    await mockEnsResolver.mock.addr.withArgs(ensNode).returns(ensAddress);
    return { ensName, ensNode, ensAddress };
  }

  it("Resolve address from ens node", async () => {
    const { ensNode, ensAddress } = await mockEnsSetup();
    expect(await publicEnsProxy.getAddressFromEnsNode(ensNode)).to.be.equal(
      ensAddress
    );
  });

  it("Multiple signers can transfer eth to ens name", async () => {
    const { ensName, ensAddress } = await mockEnsSetup();
    const [, , signer1, signer2] = await ethers.getSigners();
    const safeEns1 = new SafeEns(publicEnsProxy.address, signer1);
    const safeEns2 = new SafeEns(publicEnsProxy.address, signer2);
    const ethToSend = 1;
    const initialBalance1 = await ethers.provider.getBalance(ensAddress);
    const tx1 = await safeEns1.sendEth(ensName, ethToSend);
    await tx1.wait();
    const finalBalance1 = await ethers.provider.getBalance(ensAddress);
    expect(finalBalance1.eq(initialBalance1.add(ethToSend))).to.be.true;
    const initialBalance2 = await ethers.provider.getBalance(ensAddress);
    const tx2 = await safeEns2.sendEth(ensName, ethToSend);
    await tx2.wait();
    const finalBalance2 = await ethers.provider.getBalance(ensAddress);
    expect(finalBalance2.eq(initialBalance2.add(ethToSend))).to.be.true;
  });
});
