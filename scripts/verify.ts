import { run } from "hardhat";

async function verify(contractAddress: string, args: any[]) {
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
      contract: "contracts/Donation.sol:TransparentDonationTracker",
    });
    console.log("Contract verified successfully!");
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Contract is already verified!");
    } else {
      console.error("Error verifying contract:", e);
    }
  }
}

export { verify };
