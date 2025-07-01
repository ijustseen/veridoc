const { ethers } = require("hardhat");

async function main() {
  console.log("Деплой VeriDocRegistry контракта в Sepolia...");

  // Получаем фабрику контракта
  const VeriDocRegistry = await ethers.getContractFactory("VeriDocRegistry");

  console.log("Разворачиваем контракт...");
  const registry = await VeriDocRegistry.deploy();

  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log("✅ VeriDocRegistry развернут по адресу:", contractAddress);

  // Сохраняем адрес контракта
  const fs = require('fs');
  const contractConfig = {
    sepolia: {
      registry: contractAddress,
      chainId: 11155111,
    }
  };

  fs.writeFileSync(
    './contract-addresses.json', 
    JSON.stringify(contractConfig, null, 2)
  );

  console.log("📝 Адрес контракта сохранен в contract-addresses.json");

  // Ждем несколько блоков перед верификацией
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("⏳ Ждем блоки для верификации...");
    await registry.deploymentTransaction().wait(5);

    console.log("🔍 Верифицируем контракт на Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Контракт верифицирован!");
    } catch (error) {
      console.log("❌ Ошибка верификации:", error.message);
    }
  }

  console.log("\n📋 Информация для интеграции:");
  console.log("Адрес контракта:", contractAddress);
  console.log("Сеть: Sepolia");
  console.log("Chain ID: 11155111");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Ошибка деплоя:", error);
    process.exit(1);
  });