const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SonicSubscrypt", function () {
  async function deployAll() {
    const [owner, merchant, user] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("MockToken", "MTK");
    await token.waitForDeployment();

    const Subscription = await ethers.getContractFactory("SonicSubscrypt");
    const sub = await Subscription.deploy(await token.getAddress(), ethers.ZeroAddress);
    await sub.waitForDeployment();

    return { owner, merchant, user, token, sub };
  }

  it("creates plan and subscribes", async function () {
    const { merchant, user, token, sub } = await deployAll();

    await token.mint(user.address, ethers.parseUnits("1000", 18));
    await token.connect(user).approve(await sub.getAddress(), ethers.parseUnits("1000000", 18));

    const createTx = await sub.connect(merchant).createPlan("Basic", ethers.parseUnits("10", 18), 60, true, 100);
    const rc = await createTx.wait();
    const event = rc.logs.find(l => l.fragment && l.fragment.name === "PlanCreated");
    const planId = event.args.planId;

    await sub.connect(user).subscribe(planId, await token.getAddress());

    const subInfo = await sub.getUserSubscription(user.address);
    expect(subInfo.planId).to.equal(planId);
    expect(subInfo.active).to.equal(true);
  });

  it("processes payment and updates accounting", async function () {
    const { merchant, user, token, sub } = await deployAll();
    await token.mint(user.address, ethers.parseUnits("1000", 18));
    await token.connect(user).approve(await sub.getAddress(), ethers.parseUnits("1000000", 18));

    const planTx = await sub.connect(merchant).createPlan("Pro", ethers.parseUnits("5", 18), 60, false, 5);
    const rc = await planTx.wait();
    const event = rc.logs.find(l => l.fragment && l.fragment.name === "PlanCreated");
    const planId = event.args.planId;

    await sub.connect(user).subscribe(planId, await token.getAddress());

    const balBefore = await token.balanceOf(merchant.address);
    await sub.processPayment(user.address, await token.getAddress());
    const balAfter = await token.balanceOf(merchant.address);

    expect(balAfter - balBefore).to.equal(ethers.parseUnits("5", 18));
    const stats = await sub.getGlobalStats();
    expect(stats[0]).to.equal(ethers.parseUnits("5", 18));
  });
});


