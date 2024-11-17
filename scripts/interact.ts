import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting with contracts with the account:", deployer.address);

  // Get the deployed contract
  const donation = await ethers.getContractAt(
    "TransparentDonationTracker",
    process.env.CONTRACT_ADDRESS || ""
  );

  // Create a new cause
  const tx1 = await donation.createCause(
    "Education Fund",
    "Supporting education initiatives",
    deployer.address,
    ethers.parseEther("10")
  );
  await tx1.wait();
  console.log("Created new cause: Education Fund");

  // Add milestones
  const tx2 = await donation.addMilestone(
    "Education Fund",
    "First classroom",
    ethers.parseEther("2")
  );
  await tx2.wait();
  console.log("Added milestone to Education Fund");

  // Make a donation
  const tx3 = await donation.donate("Education Fund", {
    value: ethers.parseEther("1"),
  });
  await tx3.wait();
  console.log("Made donation of 1 ETH to Education Fund");

  // Get cause details
  const cause = await donation.causes("Education Fund");
  console.log("Cause details:", {
    currentAmount: ethers.formatEther(cause.currentAmount),
    donorCount: cause.donorCount.toString(),
    isActive: cause.isActive,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
