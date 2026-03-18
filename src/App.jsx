import { useEffect, useState } from "react";
import { ethers } from "ethers";

const SERVER_URL = "http://localhost:4000";
const CONTRACT_ABI = [
  "function getAllRecords() external view returns (tuple(string headline, bool verdict, uint256 timestamp)[])",
  "function getCount() external view returns (uint256)",
  "function addRecord(string headline, bool verdict, uint256 timestamp) external"
];

function App() {
  const [headline, setHeadline] = useState("");
  const [verdict, setVerdict] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState({ address: "", chainRpc: "" });
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [onchainCount, setOnchainCount] = useState(0);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/history`);
      const data = await response.json();
      setHistory(data.reverse());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContractInfo = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/contract`);
      const data = await response.json();
      setInfo(data || {});
      if (data?.address) {
        const provider = new ethers.providers.JsonRpcProvider(data.chainRpc);
        const contract = new ethers.Contract(data.address, CONTRACT_ABI, provider);
        const count = await contract.getCount();
        setOnchainCount(Number(count));
      }
    } catch (e) {
      console.error("Failed to fetch contract info", e);
    }
  };

  useEffect(() => {
    fetchContractInfo();
    fetchHistory();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed. Install it to use wallet features.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setWalletAddress(address);
      setWalletNetwork(`${network.name || "unknown"} (chainId: ${network.chainId})`);
      setIsWalletConnected(true);
      setError(null);

      if (info.address) {
        const contract = new ethers.Contract(info.address, CONTRACT_ABI, signer);
        const count = await contract.getCount();
        setOnchainCount(Number(count));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Wallet connection failed");
    }
  };

  const submitHeadline = async (ev) => {
    ev.preventDefault();
    if (!headline.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SERVER_URL}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline: headline.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unexpected error");
      }

      const result = await response.json();
      setVerdict(result);
      setHeadline("");
      await fetchHistory();
      setOnchainCount((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Unable to submit headline");
    } finally {
      setLoading(false);
    }
  };

  const saveWithWallet = async () => {
    if (!isWalletConnected) {
      setError("Connect a wallet first to save directly on-chain.");
      return;
    }

    if (!verdict) {
      setError("First check a headline to get a verdict before saving with your wallet.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      const signer = provider.getSigner();
      const contract = new ethers.Contract(info.address, CONTRACT_ABI, signer);
      const tx = await contract.addRecord(verdict.headline, verdict.verdict, verdict.timestamp);
      await tx.wait();
      setError(null);
      setOnchainCount((prev) => prev + 1);
      await fetchHistory();
    } catch (err) {
      console.error(err);
      setError(err.message || "On-chain save failed");
    }
  };

  return (
    <div className="app">
      <header className="top-bar">
        <h1>AI Fake News Truth Recorder</h1>

        <div className="wallet-box">
          <button onClick={connectWallet} className="wallet-btn">
            {isWalletConnected ? "Wallet Connected" : "Connect Wallet"}
          </button>
          <div>
            <small>Address: {walletAddress || "Not connected"}</small>
            <br />
            <small>Network: {walletNetwork || "--"}</small>
          </div>
        </div>
      </header>

      <div className="summary-row">
        <div className="info-card"><span>Contract</span> {info.address || "loading..."}</div>
        <div className="info-card"><span>Records</span> {onchainCount}</div>
      </div>

      <p>Enter a news headline, let AI evaluate, and store verdict on blockchain.</p>

      <form onSubmit={submitHeadline}>
        <textarea
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Type news headline here"
          rows={3}
        />

        <div className="button-row">
          <button type="submit" disabled={loading}>{loading ? "Checking..." : "Check + Server Save"}</button>
          <button type="button" onClick={saveWithWallet} disabled={!verdict || !isWalletConnected}>
            Save Verdict With Wallet
          </button>
        </div>
      </form>

      {error && <div className="error">Error: {error}</div>}

      {verdict && (
        <div className="card verdict-card">
          <h2>Latest Result</h2>
          <p><strong>Headline:</strong> {verdict.headline}</p>
          <p><strong>Likely True:</strong> {verdict.verdict ? "Yes" : "No"}</p>
          <p><strong>Saved at:</strong> {new Date(verdict.timestamp * 1000).toLocaleString()}</p>
        </div>
      )}

      <div className="history">
        <h2>Blockchain History</h2>
        {history.length === 0 ? (
          <p>No records yet</p>
        ) : (
          <ul>
            {history.map((r, idx) => (
              <li key={`${r.timestamp}-${idx}`}>
                <span>{new Date(r.timestamp * 1000).toLocaleString()}</span>
                <strong>{r.verdict ? "True" : "Fake"}</strong>
                <span>{r.headline}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
