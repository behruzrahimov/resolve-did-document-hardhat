import { ethers } from "hardhat";
import { expect } from "chai";
import { AnchorContract, MinimalForwarder } from "../typechain-types";
import * as sampleDids from "./sampleDid.json";
import { signMetaTxRequest } from "../utils/signer";
const version = "1.0";
const deploy = async (name: string, ...params: any[]) => {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
};

const getInterface = async (name: string) => {
  const Contract = await ethers.getContractFactory(name);
  return Contract.interface;
};

const getSampleDid = (index = 0) => {
  return {
    ...sampleDids[index],
    didHash: ethers.utils.id(sampleDids[index].did),
    didDocHash: ethers.utils.id(JSON.stringify(sampleDids[index].didDoc)),
  };
};

describe("DID Anchor Test", function () {
  before(async function () {
    this.accounts = await ethers.getSigners();
    const [relayer, admin1, admin2, member1, member2, nonMember] =
      this.accounts;
    this.relayer = relayer;
    this.admin1 = admin1;
    this.admin2 = admin2;
    this.member1 = member1;
    this.member2 = member2;
    this.nonMember = nonMember;

    //minimalForwarder deploy
    this.forwarder = await deploy("MinimalForwarder");

    //anchor deploy
    this.anchor = await deploy(
      "AnchorContract",
      [admin1.address, admin2.address],
      [member1.address, member2.address],
      this.forwarder.address,
      version
    );
  });

  it("should test deployment", async function () {
    const signer = this.accounts[0];
    const anchor: AnchorContract = this.anchor.connect(signer);
    expect(await anchor.version()).to.equal(version);
  });

  it("Should Anchor DID via member-1", async function () {
    const { didHash, didDocHash } = getSampleDid(0);
    const forwarder: MinimalForwarder = this.forwarder.connect(this.relayer);
    const anchor: AnchorContract = this.anchor;

    const { request, signature } = await signMetaTxRequest(
      this.member1.provider,
      forwarder,
      {
        from: this.member1.address,
        to: anchor.address,
        data: anchor.interface.encodeFunctionData("anchorDID", [
          didHash,
          didDocHash,
        ]),
      }
    );

    const tx = await forwarder.execute(request, signature);
    const receipt = await tx.wait();
    const logs = receipt.logs[0];
    const anchorInterface = await getInterface("AnchorContract");

    const {
      args: { operation },
    } = anchorInterface.parseLog({ data: logs.data, topics: logs.topics });

    const retrievedDidDocHash = await anchor.dids(didHash);
    expect(receipt.status).to.equal(1);
    expect(retrievedDidDocHash).to.equal(didDocHash);
    expect(operation.toNumber()).to.equal(0);
  });

  it("Should Anchor DID via member-2", async function () {
    const { didHash, didDocHash } = getSampleDid(1);
    const forwarder: MinimalForwarder = this.forwarder.connect(this.relayer);
    const anchor: AnchorContract = this.anchor;

    const { request, signature } = await signMetaTxRequest(
      this.member2.provider,
      forwarder,
      {
        from: this.member2.address,
        to: anchor.address,
        data: anchor.interface.encodeFunctionData("anchorDID", [
          didHash,
          didDocHash,
        ]),
      }
    );
    const tx = await forwarder.execute(request, signature);
    const receipt = await tx.wait();
    const logs = receipt.logs[0];
    const anchorInterface = await getInterface("AnchorContract");
    const {
      args: { operation },
    } = anchorInterface.parseLog({
      data: logs.data,
      topics: logs.topics,
    });
    const retrievedDidDocHash = await anchor.dids(didHash);
    expect(receipt.status).to.equal(1);
    expect(retrievedDidDocHash).to.equal(didDocHash);
    expect(operation.toNumber()).to.equal(0);
  });

  it("Should not be able to anchor DID via non-member", async function () {
    const { didHash, didDocHash } = getSampleDid(2);
    const forwarder: MinimalForwarder = this.forwarder.connect(this.relayer);
    const anchor: AnchorContract = this.anchor;
    const { request, signature } = await signMetaTxRequest(
      this.nonMember.provider,
      forwarder,
      {
        from: this.nonMember.address,
        to: anchor.address,
        data: anchor.interface.encodeFunctionData("anchorDID", [
          didHash,
          didDocHash,
        ]),
      }
    );
    const tx = await forwarder.execute(request, signature);
    const receipt = await tx.wait();
    const retrievedDidDocHash = await anchor.dids(didHash);
    expect(receipt.status).to.equal(1);
    expect(retrievedDidDocHash).to.equal(ethers.constants.HashZero);
  });

  it("Should update DID in contract via member-1", async function () {
    const { didHash, didDocHash } = getSampleDid(3);
    const forwarder: MinimalForwarder = this.forwarder.connect(this.relayer);
    const anchor: AnchorContract = this.anchor;
    const { request, signature } = await signMetaTxRequest(
      this.member1.provider,
      forwarder,
      {
        from: this.member1.address,
        to: anchor.address,
        data: anchor.interface.encodeFunctionData("anchorDID", [
          didHash,
          didDocHash,
        ]),
      }
    );
    const tx = await forwarder.execute(request, signature);
    const receipt = await tx.wait();
    const logs = receipt.logs[0];
    const anchorInterface = await getInterface("AnchorContract");
    const {
      args: { operation },
    } = anchorInterface.parseLog({ data: logs.data, topics: logs.topics });

    const retrievedDidDocHash = await anchor.dids(didHash);
    expect(receipt.status).to.equal(1);
    expect(retrievedDidDocHash).to.equal(didDocHash);
    expect(operation.toNumber()).to.equal(1);
  });

  it("Should delete DID in contract via member-1", async function () {
    const { didHash } = getSampleDid(3);
    const didDocHash = ethers.constants.HashZero;
    const forwarder: MinimalForwarder = this.forwarder.connect(this.relayer);
    const anchor: AnchorContract = this.anchor;
    const { request, signature } = await signMetaTxRequest(
      this.member1.provider,
      forwarder,
      {
        from: this.member1.address,
        to: anchor.address,
        data: anchor.interface.encodeFunctionData("anchorDID", [
          didHash,
          didDocHash,
        ]),
      }
    );
    const tx = await forwarder.execute(request, signature);
    const receipt = await tx.wait();
    const logs = receipt.logs[0];
    const anchorInterface = await getInterface("AnchorContract");
    const {
      args: { operation },
    } = anchorInterface.parseLog({ data: logs.data, topics: logs.topics });
    const retrievedDidDocHash = await anchor.dids(didHash);
    expect(receipt.status).to.equal(1);
    expect(retrievedDidDocHash).to.equal(didDocHash);
    expect(operation.toNumber()).to.equal(2);
  });

  it("Should find DIDHashes by a given DIDs via member-1", async function () {
    const { didHash: didHash1 } = getSampleDid(1);
    const { didHash: didHash2 } = getSampleDid(2);
    const { didHash: didHash3 } = getSampleDid(3);
    const anchor: AnchorContract = this.anchor;
    const didDocHash1 = await anchor.dids(didHash1);
    const didDocHash2 = await anchor.dids(didHash2);
    const didDocHash3 = await anchor.dids(didHash3);
    console.log(didDocHash1);
    console.log(didDocHash2);
    console.log(didDocHash3);
  });
});
