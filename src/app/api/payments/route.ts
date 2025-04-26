import { NextResponse } from 'next/server';
import { ethers, Log, Contract, formatUnits, JsonRpcProvider } from 'ethers'; // Added JsonRpcProvider for clarity
import TipJarABI from '@/abi/TipJar.json';

// --- CONFIGURATION --- 
// Use the correct contract address deployed on Sepolia
const TIP_JAR_CONTRACT_ADDRESS = '0xD9DE838d3664B954c3025f050287d02E15eA18BC'; // Updated Address

// Use Alchemy Sepolia RPC URL from environment variable.
// Ensure SEPOLIA_RPC_URL is set in your .env.local file:
// SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
const RPC_URL = process.env.SEPOLIA_RPC_URL;

// ---------------------

// Interface matching the structure of the decoded event log data
interface TipReceivedLogData {
    tipper: string;
    staffAddress: string; // ABI uses staffAddress now
    staffName: string;
    message: string;
    amount: bigint; 
    // Timestamp is not directly in the event data, fetched from block later
}

// Interface for the final formatted payment data sent to the frontend
interface Payment {
  id: string; // txHash-logIndex
  tipper: string;
  staffName: string;
  message: string;
  amount: string; // Formatted string like "0.01 ETH"
  transactionHash: string;
  timestamp: number; // Milliseconds since epoch
}

// Ethers Log type might not explicitly list 'index', so we extend it if necessary or use 'any'
// For simplicity, we'll adjust the check directly.

export async function GET() {
  console.log(`[API GET /api/payments] Start. Fetching history for ${TIP_JAR_CONTRACT_ADDRESS}`);

  // --- Initial Checks --- 
  if (!TIP_JAR_CONTRACT_ADDRESS || !ethers.isAddress(TIP_JAR_CONTRACT_ADDRESS)) { 
    console.error("[API GET /api/payments] Error: Invalid or missing contract address.");
    return NextResponse.json({ error: "Server configuration error: Contract address invalid or missing." }, { status: 500 });
  }
  if (!RPC_URL) {
    console.error("[API GET /api/payments] Error: SEPOLIA_RPC_URL environment variable is not set.");
    return NextResponse.json({ error: "Server configuration error: RPC URL missing. Please set SEPOLIA_RPC_URL environment variable." }, { status: 500 });
  }
  console.log(`[API GET /api/payments] Using RPC URL: ${RPC_URL.substring(0, RPC_URL.lastIndexOf('/') + 1)}...`); // Log URL without key

  // --- Main Logic --- 
  try {
    // 1. Initialize Provider
    const provider = new JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    console.log(`[API GET /api/payments] Provider connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    if (network.chainId !== 11155111n) {
         // Non-fatal warning, allows flexibility but logs potential issue
         console.warn(`[API GET /api/payments] Warning: Provider connected to chain ID ${network.chainId}, but contract expected on Sepolia (11155111)`);
    }

    // 2. Initialize Contract
    const tipJarContract = new Contract(TIP_JAR_CONTRACT_ADDRESS, TipJarABI, provider);

    // 3. Query Events
    console.log("[API GET /api/payments] Querying TipReceived events...");
    const eventFilter = tipJarContract.filters.TipReceived();
    const logs: Log[] = await tipJarContract.queryFilter(eventFilter);
    console.log(`[API GET /api/payments] Found ${logs.length} TipReceived event logs.`);

    const payments: Payment[] = [];
    
    // 4. Process Logs if found
    if (logs && logs.length > 0) {
        console.log("[API GET /api/payments] Starting processing of logs...");
        const paymentPromises = logs.map(async (log: any, index) => { // Use 'any' for log temporarily to access 'index'
            const logIdentifier = `Log ${index + 1} (Tx: ${log.transactionHash?.substring(0,10)}...)`;
            console.log(`[API GET /api/payments] Processing ${logIdentifier}`);
            try {
                // *** UPDATED VALIDATION: Check for 'index' instead of 'logIndex' ***
                if (!log.blockNumber || !log.transactionHash || typeof log.index !== 'number') {
                    console.warn(`[API GET /api/payments] ${logIdentifier} Skipping log with missing essential fields (blockNumber, transactionHash, or index). Log object:`, JSON.stringify(log, null, 2)); 
                    return null; 
                 }
                 
                 // Decode the event data using the contract interface
                 console.log(`[API GET /api/payments] ${logIdentifier} Attempting to parse log...`);
                 const decodedLog = tipJarContract.interface.parseLog({ topics: Array.from(log.topics ?? []), data: log.data ?? '0x' });
                 
                 if (!decodedLog) {
                     console.warn(`[API GET /api/payments] ${logIdentifier} Skipping log - parseLog returned null.`);
                     return null;
                 }
                 if (decodedLog.name !== 'TipReceived') {
                     console.warn(`[API GET /api/payments] ${logIdentifier} Skipping log - decoded name is not TipReceived (got ${decodedLog.name}).`);
                    return null;
                 }
                console.log(`[API GET /api/payments] ${logIdentifier} Parsed successfully. Name: ${decodedLog.name}`);
                 console.log(`[API GET /api/payments] ${logIdentifier} Decoded args:`, decodedLog.args); 

                const logData = decodedLog.args as unknown as TipReceivedLogData; 

                console.log(`[API GET /api/payments] ${logIdentifier} Fetching block ${log.blockNumber}...`);
                const block = await provider.getBlock(log.blockNumber);
                if (!block) {
                    console.warn(`[API GET /api/payments] ${logIdentifier} Failed to fetch block details for block ${log.blockNumber}. Using current time.`);
                }
                const timestampMs = block ? block.timestamp * 1000 : Date.now(); 
                console.log(`[API GET /api/payments] ${logIdentifier} Timestamp: ${timestampMs} (${new Date(timestampMs).toISOString()})`);

                // *** UPDATED ID: Use 'index' instead of 'logIndex' ***
                const paymentData: Payment = {
                    id: `${log.transactionHash}-${log.index}`, // Unique ID for React keys
                    tipper: logData.tipper,
                    staffName: logData.staffName,
                    message: logData.message,
                    amount: `${formatUnits(logData.amount, 'ether')} ETH`, // Format amount from wei
                    transactionHash: log.transactionHash,
                    timestamp: timestampMs, // Timestamp in milliseconds
                };
                 console.log(`[API GET /api/payments] ${logIdentifier} Successfully processed into payment object.`);
                return paymentData;

            } catch (processError: any) {
                console.error(`[API GET /api/payments] ${logIdentifier} Failed to process log:`, processError.message || processError);
                return null; // Skip logs that fail to process
            }
        });

        // Wait for all promises to resolve and filter out nulls (skipped/failed logs)
        const resolvedPayments = (await Promise.all(paymentPromises)).filter(p => p !== null) as Payment[];
        console.log(`[API GET /api/payments] Resolved ${resolvedPayments.length} payments after processing.`);
        payments.push(...resolvedPayments);
        
        // Sort payments by timestamp descending (newest first)
        payments.sort((a, b) => b.timestamp - a.timestamp);
    } else {
        console.log("[API GET /api/payments] No logs found, skipping processing loop.");
    }

    console.log(`[API GET /api/payments] Processed ${payments.length} valid payments. Sending response.`);
    // 5. Return Success Response
    return NextResponse.json({ payments });

  } catch (err: any) {
      // --- Error Handling --- 
      console.error("[API GET /api/payments] Error during execution:", err);
      let errorMessage = "Failed to fetch payment history."; // Default message
      
      // Provide more specific error messages based on common ethers.js errors
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('could not detect network')) {
            errorMessage = `Server connection error: Could not connect to the RPC node (${RPC_URL?.substring(0, RPC_URL.lastIndexOf('/') + 1)}...). Check the SEPOLIA_RPC_URL and network status.`;
        } else if (err.message?.includes('project ID') || err.message?.includes('API key') || err.status === 401) {
            errorMessage = `Server authentication error with RPC node. Is the API key in SEPOLIA_RPC_URL correct?`;
        } else if (err.message?.includes('contract address') || err.code === 'INVALID_ARGUMENT') {
            errorMessage = "Server configuration error: Invalid contract address provided or contract may not exist on the target network.";
        } else if (err.code === 'SERVER_ERROR') {
            errorMessage = `RPC node error: The node returned an internal server error. It might be temporarily unavailable. (${err.message})`;
        } else if (err.code === 'TIMEOUT') {
            errorMessage = `RPC node timeout: The request to the node timed out. The network may be congested or the node slow.`;
        }
        
      // Return Error Response
      return NextResponse.json({ error: errorMessage, details: err.message || 'No additional details' }, { status: 500 });
  } 
}
