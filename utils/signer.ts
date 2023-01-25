import { DataType, InputType, RequestType, SignerProviderType } from "./types";
import ethSigUtil from "eth-sig-util";
import { MinimalForwarder } from "../typechain-types/@openzeppelin/contracts/metatx";

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const ForwardRequest = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "gas", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "data", type: "bytes" },
];

function getMetaTxTypeData(chainId: number, verifyingContract: string) {
  return {
    types: {
      EIP712Domain,
      ForwardRequest,
    },
    domain: {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId,
      verifyingContract,
    },
    primaryType: "ForwardRequest",
  };
}

async function signTypedData(
  signerProvider: SignerProviderType | string,
  from: string,
  data: DataType
): Promise<string> {
  // If signer is a private key, use it to sign
  if (typeof signerProvider === "string") {
    const privateKey = Buffer.from(signerProvider.replace(/^0x/, ""), "hex");

    return ethSigUtil.signTypedMessage(privateKey, data);
  }

  // Otherwise, send the signTypedData RPC call
  // Note that hardhatvm and metamask require different EIP712 input
  const [method, argData] = ["eth_signTypedData_v4", JSON.stringify(data)];
  const signature = await signerProvider.send(method, [from, argData]);
  return signature;
}

export async function buildRequest(
  forwarder: MinimalForwarder,
  input: InputType
): Promise<RequestType> {
  const nonce = await forwarder
    .getNonce(input.from)
    .then((nonce) => nonce.toString());
  const req = {
    ...input,
    value: 0,
    gas: 1e6,
    nonce,
  };
  return req;
}

export async function buildTypedData(
  forwarder: MinimalForwarder,
  request: RequestType
) {
  const chainId = await forwarder.provider
    .getNetwork()
    .then((n: { chainId: number; name: string }) => n.chainId);

  const typeData = getMetaTxTypeData(chainId, forwarder.address);
  return { ...typeData, message: request };
}
export async function signMetaTxRequest(
  signerProvider: SignerProviderType,
  forwarder: MinimalForwarder,
  input: InputType
) {
  const request = await buildRequest(forwarder, input);
  const toSign = await buildTypedData(forwarder, request);
  const signature = await signTypedData(signerProvider, input.from, toSign);
  return { signature, request };
}
