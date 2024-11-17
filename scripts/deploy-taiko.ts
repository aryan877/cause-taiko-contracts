import { ethers } from "hardhat";
import { verify } from "./verify";

async function main() {
  try {
    console.log("Deploying to Taiko network...");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy the contract
    const Contract = await ethers.getContractFactory(
      "TransparentDonationTracker"
    );
    console.log("Deploying contract...");

    // Add explicit gas limit for deployment
    const contract = await Contract.deploy({
      gasLimit: 5000000,
    });
    console.log("Contract deployment initiated...");

    // Get the contract instance
    const contractAddress = await contract.getAddress();
    console.log("Contract address:", contractAddress);

    // Wait for deployment to complete
    console.log("Waiting for deployment to complete...");
    await contract.waitForDeployment();
    console.log("Contract deployed successfully");

    // Wait for blockchain to stabilize
    console.log("Waiting for blockchain to stabilize...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Initialize with sample causes
    console.log("\nInitializing with sample causes...");

    try {
      // Create Education Fund cause with explicit gas limit
      console.log("Creating Education Fund cause...");
      const tx1 = await contract.createCause(
        "Education Fund",
        "Supporting education initiatives in developing regions",
        deployer.address,
        ethers.parseEther("10"),
        {
          gasLimit: 2000000,
          gasPrice: await deployer.provider
            .getFeeData()
            .then((data) => data.gasPrice),
        }
      );
      console.log("Waiting for Education Fund transaction...");
      await tx1.wait(1);
      console.log("Created Education Fund cause");

      // Wait between transactions
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Get the cause ID for Education Fund
      const educationFundId = await contract.causeNameToId("Education Fund");

      // Add milestones for Education Fund with explicit gas limit
      console.log("Adding milestone to Education Fund...");
      const tx2 = await contract.addMilestone(
        educationFundId,
        "First classroom built",
        ethers.parseEther("2"),
        {
          gasLimit: 2000000,
          gasPrice: await deployer.provider
            .getFeeData()
            .then((data) => data.gasPrice),
        }
      );
      console.log("Waiting for milestone transaction...");
      await tx2.wait(1);
      console.log("Added first milestone to Education Fund");

      // Wait between transactions
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Create Healthcare cause with explicit gas limit
      console.log("Creating Healthcare Access cause...");
      const tx3 = await contract.createCause(
        "Healthcare Access",
        "Providing medical supplies and healthcare access",
        deployer.address,
        ethers.parseEther("20"),
        {
          gasLimit: 2000000,
          gasPrice: await deployer.provider
            .getFeeData()
            .then((data) => data.gasPrice),
        }
      );
      console.log("Waiting for Healthcare Access transaction...");
      await tx3.wait(1);
      console.log("Created Healthcare Access cause");
    } catch (error: any) {
      console.error("Error during initialization:", error.message);
      if (error.data) {
        console.error("Error data:", error.data);
      }
      console.log("Contract deployed but initialization failed");
    }

    // Skip verification on Taiko testnet as it's not supported yet
    console.log("\nSkipping contract verification on Taiko testnet");
    console.log(
      "You can verify the contract manually once verification is supported"
    );

    console.log("\nDeployment Summary:");
    console.log("--------------------");
    console.log("Network: Taiko Testnet");
    console.log("Contract address:", contractAddress);
    console.log("Deployer address:", deployer.address);
    console.log(
      "Explorer link:",
      `https://explorer.hekla.taiko.xyz/address/${contractAddress}`
    );

    return { contract, deployer };
  } catch (error: any) {
    console.error("Deployment failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
