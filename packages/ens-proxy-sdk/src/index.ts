import { hash, normalize } from "@ensdomains/eth-ens-namehash";
import { BigNumberish, Contract, providers, Signer, utils } from "ethers";

// Export the contract type defs/json abis
import EnsLibraryJson from "./sc-generated/artifacts/contracts/EnsLibrary.sol/EnsLibrary.json";
import OwnableEnsProxyJson from "./sc-generated/artifacts/contracts/OwnableEnsProxy.sol/OwnableEnsProxy.json";
import OwnableEnsProxyFactoryJson from "./sc-generated/artifacts/contracts/OwnableEnsProxyFactory.sol/OwnableEnsProxyFactory.json";
import PublicEnsProxyJson from "./sc-generated/artifacts/contracts/PublicEnsProxy.sol/PublicEnsProxy.json";
import { OwnableEnsProxy } from "./sc-generated/typechain-types";
export {
  EnsLibraryJson,
  OwnableEnsProxyJson,
  OwnableEnsProxyFactoryJson,
  PublicEnsProxyJson,
};
export * from "./sc-generated/typechain-types/OwnableEnsProxy";
export * from "./sc-generated/typechain-types/OwnableEnsProxyFactory";
export * from "./sc-generated/typechain-types/PublicEnsProxy";
export * from "./sc-generated/typechain-types/factories/OwnableEnsProxy__factory";
export * from "./sc-generated/typechain-types/factories/OwnableEnsProxyFactory__factory";
export * from "./sc-generated/typechain-types/factories/PublicEnsProxy__factory";

const ZERO_WORD =
  "0000000000000000000000000000000000000000000000000000000000000000";

// https://etherscan.io/address/0x4f8e7696E846E24914a32c7b1f090D91b51aaA0B#code
export const PUBLIC_ENS_PROXY_ADDRESS =
  "0x4f8e7696E846E24914a32c7b1f090D91b51aaA0B";

// https://etherscan.io/address/0xE254C5cd48206F07009Ed1C7837565707B317F15#code
export const OWNABLE_ENS_PROXY_FACTORY_ADDRESS =
  "0xE254C5cd48206F07009Ed1C7837565707B317F15";

export class SafeEns {
  private readonly ensProxy: OwnableEnsProxy;

  constructor(ensProxyAddress: string, signer: Signer) {
    this.ensProxy = new Contract(
      ensProxyAddress,
      OwnableEnsProxyJson.abi,
      signer,
    ) as OwnableEnsProxy;
    // NOTE: the OwnableEnsProxy and PublicEnsProxy have the same interface/abi, so either one will work here
  }

  public sendEth(
    to: string,
    value: BigNumberish,
  ): Promise<providers.TransactionResponse> {
    if (looksLikeEns(to)) {
      return this.ensProxy.forwardWithEnsParamaterAndEnsProxyDestinationResolution(
        toEnsNode(to),
        [],
        [],
        [],
        { value },
      );
    } else {
      return this.ensProxy.signer.sendTransaction({ to, value });
    }
  }

  public newContract<T extends Contract>(
    address: string,
    abi: any,
  ): T & { baseContract: T } {
    return makeEnsSafeContract(
      this.ensProxy,
      address,
      abi,
      this.ensProxy.signer,
    );
  }

  public connect(signer: Signer) {
    return new SafeEns(this.ensProxy.address, signer);
  }
}

function makeEnsSafeContract<T extends Contract>(
  ensProxy: OwnableEnsProxy,
  address: string,
  abi: any,
  signerOrProvider?: Signer | providers.Provider,
): T & { baseContract: T } {
  const iface = new utils.Interface(abi);
  const contract = new Contract(address, abi, signerOrProvider);
  if (signerOrProvider) {
    ensProxy = ensProxy.connect(signerOrProvider);
  }
  return new Proxy(
    {},
    {
      get(_, property: string) {
        if (property == "baseContract") {
          return contract;
        }
        if (property === "attach") {
          return (newAddress: string) =>
            makeEnsSafeContract(ensProxy, newAddress, abi, signerOrProvider);
        }
        if (property === "connect") {
          return (newSignerOrProvider: any) =>
            makeEnsSafeContract(ensProxy, address, abi, newSignerOrProvider);
        }
        const fragment = iface.getFunction(property);
        if (!fragment) {
          return contract[property];
        }
        if (!["nonpayable", "payable"].includes(fragment.stateMutability)) {
          return contract[property];
        }
        return (...args: any[]) => {
          const nodesByDummyWord: Record<string, string> = {};
          const dummiedArgs: any[] = [];
          args.forEach((arg) => {
            // TODO: use index to look for address arg type in interface.
            const getReplacementArg = (x: any): any => {
              if (looksLikeEns(x)) {
                const dummyAddress = getRandomAddress();
                nodesByDummyWord[addressToWord(dummyAddress)] = toEnsNode(x);
                return dummyAddress;
              } else if (Array.isArray(x)) {
                return x.map(getReplacementArg);
              } else if (x && typeof x === "object") {
                const dummied: Record<string, any> = {};
                Object.entries(x).forEach(
                  ([key, value]) => (x[key] = getReplacementArg(value)),
                );
                return dummied;
              } else {
                return x;
              }
            };
            dummiedArgs.push(getReplacementArg(arg));
          });
          const callData = iface.encodeFunctionData(fragment, dummiedArgs);
          const offsets: number[] = [];
          const ensNodes: string[] = [];
          Object.entries(nodesByDummyWord).forEach(([dummyWord, ensNode]) => {
            const index = callData.indexOf(dummyWord);
            // subtract 2 to remove the "0x" and divide by 2 because bytes
            offsets.push((index - 2) / 2);
            ensNodes.push(ensNode);
          });
          if (looksLikeEns(address)) {
            return ensProxy.forwardWithEnsParamaterAndEnsProxyDestinationResolution(
              toEnsNode(address),
              offsets,
              ensNodes,
              callData,
            );
          } else {
            return ensProxy.forwardWithEnsParamaterResolution(
              address,
              offsets,
              ensNodes,
              callData,
            );
          }
        };
      },
    },
  ) as any;
}

function looksLikeEns(x: any): boolean {
  return typeof x === "string" && x.endsWith(".eth");
}

export function toEnsNode(ensName: string): string {
  return hash(normalize(ensName));
}

function getRandomAddress(): string {
  const parts: string[] = ["0x"];
  utils
    .randomBytes(20)
    .forEach((byte) => parts.push(zeroPadToLength(byte.toString(16), 2)));
  return parts.join("");
}

function addressToWord(address: string): string {
  return zeroPadToLength(address.slice(2), 64);
}

function zeroPad(s: string, n: number): string {
  return ZERO_WORD.slice(0, n) + s;
}

function zeroPadToLength(s: string, length: number): string {
  return zeroPad(s, length - s.length);
}
