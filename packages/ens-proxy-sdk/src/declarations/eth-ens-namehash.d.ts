declare module "@ensdomains/eth-ens-namehash" {
  export function hash(domain: string): string;
  export function normalize(domain: string): string;
}
