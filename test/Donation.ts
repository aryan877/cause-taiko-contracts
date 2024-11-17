import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TransparentDonationTracker", function () {
  async function deployDonationFixture() {
    const [owner, beneficiary1, beneficiary2, donor1, donor2] =
      await ethers.getSigners();

    const Donation = await ethers.getContractFactory(
      "TransparentDonationTracker"
    );
    const donation = await Donation.deploy();

    return {
      donation,
      owner,
      beneficiary1,
      beneficiary2,
      donor1,
      donor2,
    };
  }

  describe("Cause Management", function () {
    it("Should create a new cause", async function () {
      const { donation, owner, beneficiary1 } = await loadFixture(
        deployDonationFixture
      );

      await expect(
        donation.createCause(
          "Education Fund",
          "Supporting education",
          beneficiary1.address,
          ethers.parseEther("10")
        )
      )
        .to.emit(donation, "CauseCreated")
        .withArgs(
          await donation.causeNameToId("Education Fund"),
          "Education Fund",
          "Supporting education",
          beneficiary1.address,
          ethers.parseEther("10")
        );

      const causeId = await donation.causeNameToId("Education Fund");
      const cause = await donation.causesById(causeId);
      expect(cause.name).to.equal("Education Fund");
      expect(cause.isActive).to.be.true;
    });

    it("Should add milestones to a cause", async function () {
      const { donation, owner, beneficiary1 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const causeId = await donation.causeNameToId("Education Fund");

      await expect(
        donation.addMilestone(
          causeId,
          "First milestone",
          ethers.parseEther("2")
        )
      )
        .to.emit(donation, "MilestoneAdded")
        .withArgs(
          causeId,
          "Education Fund",
          "First milestone",
          ethers.parseEther("2")
        );

      const milestones = await donation.getCauseMilestones(causeId);
      expect(milestones.length).to.equal(1);
      expect(milestones[0].description).to.equal("First milestone");
    });
  });

  describe("Donations", function () {
    it("Should process donations correctly", async function () {
      const { donation, beneficiary1, donor1 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const timestamp = await time.latest();
      const causeId = await donation.causeNameToId("Education Fund");

      await expect(
        donation
          .connect(donor1)
          .donate(causeId, { value: ethers.parseEther("1") })
      )
        .to.emit(donation, "DonationReceived")
        .withArgs(
          donor1.address,
          causeId,
          "Education Fund",
          ethers.parseEther("1"),
          100,
          timestamp + 1
        );

      const cause = await donation.causesById(causeId);
      expect(cause.currentAmount).to.equal(ethers.parseEther("1"));
      expect(cause.donorCount).to.equal(1);
    });

    it("Should award badges based on donation amounts", async function () {
      const { donation, beneficiary1, donor1 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const causeId = await donation.causeNameToId("Education Fund");

      // Donate enough for bronze badge
      await expect(
        donation
          .connect(donor1)
          .donate(causeId, { value: ethers.parseEther("0.1") })
      )
        .to.emit(donation, "BadgeEarned")
        .withArgs(donor1.address, "BRONZE", 0);

      expect(await donation.hasBronzeBadge(donor1.address)).to.be.true;

      // Donate more for silver badge
      await donation
        .connect(donor1)
        .donate(causeId, { value: ethers.parseEther("0.4") });
      expect(await donation.hasSilverBadge(donor1.address)).to.be.true;
    });

    it("Should track impact scores", async function () {
      const { donation, beneficiary1, donor1 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const causeId = await donation.causeNameToId("Education Fund");

      await donation
        .connect(donor1)
        .donate(causeId, { value: ethers.parseEther("1") });

      const impactScore = await donation.getDonorImpactScore(donor1.address);
      expect(impactScore).to.equal(100); // 1 ETH = 100 impact score
    });
  });

  describe("Milestones", function () {
    it("Should complete milestones when threshold reached", async function () {
      const { donation, beneficiary1, donor1 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const causeId = await donation.causeNameToId("Education Fund");

      await donation.addMilestone(
        causeId,
        "First milestone",
        ethers.parseEther("1")
      );

      const timestamp = await time.latest();

      await expect(
        donation
          .connect(donor1)
          .donate(causeId, { value: ethers.parseEther("1") })
      )
        .to.emit(donation, "MilestoneCompleted")
        .withArgs(causeId, "Education Fund", 0, timestamp + 1);

      const milestones = await donation.getCauseMilestones(causeId);
      expect(milestones[0].isCompleted).to.be.true;
    });
  });

  describe("Funds Withdrawal", function () {
    it("Should allow beneficiary to withdraw funds", async function () {
      const { donation, beneficiary1, donor1 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const causeId = await donation.causeNameToId("Education Fund");

      await donation
        .connect(donor1)
        .donate(causeId, { value: ethers.parseEther("1") });

      await expect(donation.connect(beneficiary1).withdrawFunds(causeId))
        .to.emit(donation, "FundsWithdrawn")
        .withArgs(
          causeId,
          "Education Fund",
          beneficiary1.address,
          ethers.parseEther("1")
        );

      const cause = await donation.causesById(causeId);
      expect(cause.currentAmount).to.equal(0);
    });

    it("Should prevent non-beneficiary from withdrawing", async function () {
      const { donation, beneficiary1, donor1, donor2 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const causeId = await donation.causeNameToId("Education Fund");

      await donation
        .connect(donor1)
        .donate(causeId, { value: ethers.parseEther("1") });

      await expect(
        donation.connect(donor2).withdrawFunds(causeId)
      ).to.be.revertedWith("Not beneficiary");
    });
  });

  describe("View Functions", function () {
    it("Should return correct donor history", async function () {
      const { donation, beneficiary1, donor1 } = await loadFixture(
        deployDonationFixture
      );

      await donation.createCause(
        "Education Fund",
        "Supporting education",
        beneficiary1.address,
        ethers.parseEther("10")
      );

      const causeId = await donation.causeNameToId("Education Fund");

      await donation
        .connect(donor1)
        .donate(causeId, { value: ethers.parseEther("1") });

      const history = await donation.getDonorHistory(donor1.address);
      expect(history.length).to.equal(1);
      expect(history[0].amount).to.equal(ethers.parseEther("1"));
      expect(history[0].causeId).to.equal(causeId);
    });
  });
});
