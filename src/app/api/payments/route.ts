import { NextResponse } from 'next/server';
import { ethers, Log, Contract } from 'ethers';
import TipJarABI from '@/abi/TipJar.json';

// Define contract address and RPC URL here (or use environment variables for better security)
const TIP_JAR_CONTRACT_ADDRESS = '0x428b38aFF7D06d10A55639B08C8c22f76A851ACE'; // <<< Ensure this is your correct address
// Use an RPC URL - consider using environment variables for production
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/wtdtFfZB_bgmFncVo4F0XDL72CaWv9fH';

// Interface matching the structure of the decoded event log data
interface TipReceivedLogData {
    tipper: string;
    staffName: string;
    message: string;
    amount: bigint; 
    timestamp: bigint;
}

// Interface for the final formatted payment data sent to the frontend
interface Payment {
  id: string; 
  tipper: string;
  staffName: string;
  message: string;
  amount: string; 
  transactionHash: string;
  timestamp: number; 
}

export async function GET() {
  console.log(`API route /api/payments called. Fetching history for ${TIP_JAR_CONTRACT_ADDRESS} via ${RPC_URL}`);

  if (!TIP_JAR_CONTRACT_ADDRESS || TIP_JAR_CONTRACT_ADDRESS === 'YOUR_DEPLOYED_CONTRACT_ADDRESS') {
    console.error("API Route Error: Contract address is not set.");
    return NextResponse.json({ error: "Server configuration error: Contract address missing." }, { status: 500 });
  }

  try {
    // Initialize provider and contract on the server side
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const tipJarContract = new Contract(TIP_JAR_CONTRACT_ADDRESS, TipJarABI, provider);

    console.log("Querying TipReceived events via API route...");
    const logs = await tipJarContract.queryFilter('TipReceived');
    console.log(`API route found ${logs.length} event logs.`);

    // Process logs
    const fetchedPayments = logs.map((log: Log | any) => {
        if (!log.args) {
            console.warn("API Log missing args:", log);
            return null;
        }
        const eventData = log.args as unknown as TipReceivedLogData;
        const amountEth = ethers.formatEther(eventData.amount);

        return {
            id: `${log.transactionHash}-${log.index}`,
            tipper: eventData.tipper,
            staffName: eventData.staffName,
            message: eventData.message,
            amount: `${amountEth} ETH`,
            transactionHash: log.transactionHash,
            timestamp: Number(eventData.timestamp * 1000n)
        };
    }).filter((p): p is Payment => p !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    // Return the fetched payments as JSON
    return NextResponse.json({ payments: fetchedPayments });

  } catch (err: any) {
    console.error("API Route Error - Failed to fetch payment history:", err);
    // Determine a user-friendly error message
    let errorMessage = "Failed to fetch payment history from the blockchain.";
    if (err.code === 'NETWORK_ERROR' || err.message?.includes('could not detect network')) {
        errorMessage = `Server could not connect to the RPC node (${RPC_URL}). Please check the RPC URL and network status.`;
    } else if (err.message?.includes('contract address') || err.code === 'INVALID_ARGUMENT') {
        errorMessage = "Server error: Invalid contract address configuration or contract not found on network.";
    } else if (err.code === 'SERVER_ERROR') {
        errorMessage = `Server error: The RPC node (${RPC_URL}) returned an error. It might be unavailable. (${err.message})`;
    }
    
    return NextResponse.json({ error: errorMessage, details: err.message }, { status: 500 });
  }
}
