const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying VeriDoc contracts...");

  // Deploy DocumentRegistry first
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy();
  await documentRegistry.waitForDeployment();
  
  const documentRegistryAddress = await documentRegistry.getAddress();
  console.log("DocumentRegistry deployed to:", documentRegistryAddress);

  // Deploy SignatureManager with DocumentRegistry address
  const SignatureManager = await ethers.getContractFactory("SignatureManager");
  const signatureManager = await SignatureManager.deploy(documentRegistryAddress);
  await signatureManager.waitForDeployment();
  
  const signatureManagerAddress = await signatureManager.getAddress();
  console.log("SignatureManager deployed to:", signatureManagerAddress);

  // Deploy DocumentAccessControl
  const DocumentAccessControl = await ethers.getContractFactory("DocumentAccessControl");
  const documentAccessControl = await DocumentAccessControl.deploy();
  await documentAccessControl.waitForDeployment();
  
  const documentAccessControlAddress = await documentAccessControl.getAddress();
  console.log("DocumentAccessControl deployed to:", documentAccessControlAddress);

  console.log("All contracts deployed successfully!");
  console.log("DocumentRegistry:", documentRegistryAddress);
  console.log("SignatureManager:", signatureManagerAddress);
  console.log("DocumentAccessControl:", documentAccessControlAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 