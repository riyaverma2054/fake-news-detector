import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { ethers } from "ethers";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const CHAIN_RPC_URL = process.env.CHAIN_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const HF_API_KEY = process.env.HF_API_KEY || "";

const deployed = JSON.parse(fs.readFileSync("deployedAddress.json", "utf-8"));
const contractAddress = deployed.address;
const abi = [
  "function addRecord(string headline, bool verdict, uint256 timestamp) external",
  "function getAllRecords() external view returns (tuple(string headline, bool verdict, uint256 timestamp)[])",
  "function getCount() external view returns (uint256)"
];

const provider = new ethers.providers.JsonRpcProvider(CHAIN_RPC_URL);
const signer = PRIVATE_KEY
  ? new ethers.Wallet(PRIVATE_KEY, provider)
  : provider.getSigner(0);
const contract = new ethers.Contract(contractAddress, abi, signer);

async function predictHeadlineTruth(headline) {
  if (HF_API_KEY) {
    try {
      const resp = await axios.post(
        "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
        {
          inputs: headline,
          parameters: {
            candidate_labels: ["true", "fake"],
            hypothesis_template: "This text is {}."
          }
        },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const labels = resp.data.labels;
      const scores = resp.data.scores;
      const trueIndex = labels.findIndex((label) => label.toLowerCase() === "true");
      const fakeIndex = labels.findIndex((label) => label.toLowerCase() === "fake");

      if (trueIndex !== -1 && fakeIndex !== -1) {
        return scores[trueIndex] >= scores[fakeIndex];
      }
    } catch (error) {
      console.error("HF API failed, falling back heuristic", error?.response?.data || error.message);
    }
  }

  const lower = headline.toLowerCase();
  const fakeKeywords = ["fake", "hoax", "false", "misleading", "fabricated", "not true", "satire"];
  const trueKeywords = ["confirmed", "official", "verified", "report", "expert"];

  const hasFake = fakeKeywords.some((k) => lower.includes(k));
  const hasTrue = trueKeywords.some((k) => lower.includes(k));

  if (hasFake && !hasTrue) return false;
  if (hasTrue && !hasFake) return true;

  return false;
}

app.post("/api/check", async (req, res) => {
  const headline = (req.body.headline || "").trim();
  if (!headline) {
    return res.status(400).json({ error: "headline is required" });
  }

  const verdict = await predictHeadlineTruth(headline);
  const timestamp = Math.floor(Date.now() / 1000);

  const tx = await contract.addRecord(headline, verdict, timestamp);
  await tx.wait();

  return res.json({ headline, verdict, timestamp });
});

app.get("/api/history", async (req, res) => {
  try {
    const records = await contract.getAllRecords();
    const mapped = records.map((item) => ({
      headline: item.headline,
      verdict: item.verdict,
      timestamp: Number(item.timestamp)
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/contract", (req, res) => {
  res.json({
    address: contractAddress,
    chainRpc: CHAIN_RPC_URL
  });
});

app.listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`);
  console.log(`Contract address: ${contractAddress}`);
});
