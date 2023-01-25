import { expect } from "chai";
import { ethers } from "hardhat";
import { signMetaTxRequest } from "../utils/signer";
import * as sampleDids from "./sampleDid.json";
import { AnchorContract } from "../typechain-types/index";
import { MinimalForwarder } from "../typechain-types/index";
const version = "1.0";

async function deploy(name: string, ...params: any[]) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

async function getInterface(name: string) {
  const Contract = await ethers.getContractFactory(name);
  return Contract.interface;
}

function getSampleDid(index = 0) {
  return {
    ...sampleDids[index],
    didHash: ethers.utils.id(sampleDids[index].did),
    didDocHash: ethers.utils.id(JSON.stringify(sampleDids[index].didDoc)),
  };
}

describe("DID Anchor Test with Transaction Relayer", function () {
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

    this.forwarder = await deploy("MinimalForwarder");
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

  it("Should Anchor DID with meta-tx via member-1", async function () {
    const { didHash, didDocHash } = getSampleDid(0);
    const forwarder: MinimalForwarder = this.forwarder;
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
    expect(operation.toNumber()).to.equal(0); // ensuring operation status is 0(create)
  });

  it("Should Anchor DID with meta-tx via member-2", async function () {
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
    } = anchorInterface.parseLog({ data: logs.data, topics: logs.topics });
    const retrievedDidDocHash = await anchor.dids(didHash);
    expect(receipt.status).to.equal(1);
    expect(retrievedDidDocHash).to.equal(didDocHash);
    expect(operation.toNumber()).to.equal(0); // ensuring operation status is 0(create)
  });

  it("Should not be able to anchor DID with meta-tx via non-member", async function () {
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

  it("Should update DID in contract with meta-tx via member-1", async function () {
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
    expect(operation.toNumber()).to.equal(1); // ensuring operation status is 1(update)
  });

  it("Should delete DID in contract with meta-tx via member-1", async function () {
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
    expect(operation.toNumber()).to.equal(2); // ensuring operation status is 2(delete)
  });

  it("Should find DIDHashes by a given DIDs via member-1", async function () {
    const { didHash: didHash1 } = getSampleDid(1);
    const { didHash: didHash2 } = getSampleDid(2);
    const { didHash: didHash3 } = getSampleDid(3);
    const anchor: AnchorContract = this.anchor;
    const didDocHash1 = await anchor.dids(didHash1);
    const didDocHash2 = await anchor.dids(didHash2);
    const didDocHash3 = await anchor.dids(didHash3);
    expect(didDocHash1).to.equal(didDocHash1);
  });
});
