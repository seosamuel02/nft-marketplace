import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Manual Deployment via ethers + hre.artifacts");

    // Connect to the local node
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    // In Hardhat node, account 0 is usually unlocked.
    // getSigner(0) might work, or getSigner() gets the first one.
    const signer = await provider.getSigner(0);
    console.log("Deploying with:", await signer.getAddress());

    async function deploy(name, args = []) {
        const artifact = await hre.artifacts.readArtifact(name);
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
        const contract = await factory.deploy(...args);
        // Ethers v6 deployment wait
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        console.log(`${name} deployed to:`, address);
        return { contract, address };
    }

    const { address: tokenAddress } = await deploy("OceanToken");
    const { address: nftAddress } = await deploy("OceanNFT");
    const { address: marketAddress } = await deploy("OceanMarket", [tokenAddress]);

    // Save Contract Addresses for Frontend
    const config = {
        oceanToken: tokenAddress,
        oceanNFT: nftAddress,
        oceanMarket: marketAddress,
    };

    const frontendDir = path.join(__dirname, "../../frontend/src/config");
    if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(frontendDir, "contract-addresses.json"),
        JSON.stringify(config, null, 2)
    );

    const artifactsDir = path.join(__dirname, "../artifacts/contracts");
    const frontendAbiDir = path.join(frontendDir, "abis");
    if (!fs.existsSync(frontendAbiDir)) {
        fs.mkdirSync(frontendAbiDir, { recursive: true });
    }

    const contracts = ["OceanToken", "OceanNFT", "OceanMarket"];

    contracts.forEach(contract => {
        const artifactPath = path.join(artifactsDir, `${contract}.sol/${contract}.json`);
        if (fs.existsSync(artifactPath)) {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
            fs.writeFileSync(
                path.join(frontendAbiDir, `${contract}.json`),
                JSON.stringify(artifact.abi, null, 2)
            );
        }
    });

    console.log("Addresses and ABIs saved to frontend/src/config");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
