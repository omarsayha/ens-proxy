# ENS Proxy Smart Contract

A fully tested implementation of on-chain ENS resolution.

### EnsLibrary

A simple utility library to resolve ENS nodes to an address using a
registry and a resolver.

### PublicEnsProxy

A public ENS utility that allows you to resolve ENS nodes on-chain.
It has the following two methods:

forwardWithEnsParamaterResolution:

- allows you to replace ens nodes with addresses in an arbitrary function call to
  any smart contract

forwardWithEnsParamaterAndEnsProxyDestinationResolution:

- allows you to call a smart contract that lives at an ens node and also replace
  ens nodes with addresses in an arbitrary function call to that smart contract

### OwnableEnsProxy

A private ownable ENS utility with the same interface and implementation as
PublicEnsProxy that con only be invoked by the owner. To save gas, this contract
is created using the OwnableEnsProxyFactory

### OwnableEnsProxyFactory

Used to create an OwnableEnsProxy.
