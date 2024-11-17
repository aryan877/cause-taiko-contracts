import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  // Deploy the contract
  const DonationTracker = await ethers.getContractFactory(
    "TransparentDonationTracker"
  );
  const donationTracker = await DonationTracker.deploy();
  await donationTracker.waitForDeployment();

  const address = await donationTracker.getAddress();
  console.log("TransparentDonationTracker deployed to:", address);

  // Initialize with some sample causes
  console.log("\nInitializing with sample causes...");

  // Create Education Fund cause
  const tx1 = await donationTracker.createCause(
    "Education Fund",
    "Supporting education initiatives in developing regions",
    deployer.address,
    ethers.parseEther("10")
  );
  await tx1.wait();
  console.log("Created Education Fund cause");

  // Add milestones for Education Fund
  const tx2 = await donationTracker.addMilestone(
    "Education Fund",
    "First classroom built",
    ethers.parseEther("2")
  );
  await tx2.wait();
  console.log("Added first milestone to Education Fund");

  // Create Healthcare cause
  const tx3 = await donationTracker.createCause(
    "Healthcare Access",
    "Providing medical supplies and healthcare access",
    deployer.address,
    ethers.parseEther("20")
  );
  await tx3.wait();
  console.log("Created Healthcare Access cause");

  console.log("\nDeployment and initialization complete!");
  console.log("Contract address:", address);

  // Return the contract address and deployer for verification
  return { donationTracker, deployer };
}

// Export for use in other scripts
export default main;

// Execute if script is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
