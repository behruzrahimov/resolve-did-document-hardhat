export type DataType = {
  message: any;
  types: {
    EIP712Domain: {
      name: string;
      type: string;
    }[];
    ForwardRequest: {
      name: string;
      type: string;
    }[];
  };
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  primaryType: string;
};

export type InputType = {
  from: string;
  to: string;
  data: string;
};

export type RequestType = {
  value: number;
  gas: number;
  nonce: string;
  from: string;
  to: string;
  data: string;
};

export type SignerProviderType = {
  send: (
    method: string,
    arg: [from: string, argData: string]
  ) => Promise<string>;
};
