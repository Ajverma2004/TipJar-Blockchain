'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers, TransactionResponse, TransactionReceipt, Network, BrowserProvider, Signer, Contract, isAddress } from 'ethers'; // Added isAddress
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import TipJarABI from '@/abi/TipJar.json';
import staffData from '@/staffs.json'; // Import staff data

// --- !!! Contract Address and Network Configuration !!! ---
const TIP_JAR_CONTRACT_ADDRESS = '0xD9DE838d3664B954c3025f050287d02E15eA18BC'; // Updated Address
const TARGET_NETWORK_CHAIN_ID = 11155111n; // Sepolia Chain ID
const TARGET_NETWORK_NAME = 'Sepolia';
// ----------------------------------------------------------

enum TxStatus {
  Idle,
  Connecting,
  Sending,
  Mining,
  Success,
  Error
}

interface TipFormProps {
  selectedStaff: string;
}

// Helper function to get Etherscan base URL
const getEtherscanBaseUrl = (chainId: bigint): string => {
  switch (chainId) {
    case 1n: return 'https://etherscan.io';
    case 5n: return 'https://goerli.etherscan.io'; 
    case 11155111n: return 'https://sepolia.etherscan.io'; // Sepolia
    case 84532n: return 'https://sepolia.basescan.org'; 
    default: return `https://etherscan.io`; // Fallback
  }
};

const TipForm: React.FC<TipFormProps> = ({ selectedStaff }) => {
  const [name, setName] = useState(''); // Used for the message
  const [amount, setAmount] = useState<number | ''>('');

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [tipJarContract, setTipJarContract] = useState<Contract | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>(TxStatus.Idle);
  const [txError, setTxError] = useState<string | null>(null);
  const [isMetamaskInstalled, setIsMetamaskInstalled] = useState(true);

  const { toast } = useToast();

  // --- State Update Functions ---
  const updateNetwork = useCallback(async (currentProvider: BrowserProvider) => {
    try {
      const networkInfo = await currentProvider.getNetwork();
      setNetwork(networkInfo);
      console.log('[TipForm] Connected Network:', networkInfo);
      if (networkInfo.chainId !== TARGET_NETWORK_CHAIN_ID) {
        console.warn(`[TipForm] Connected to wrong network: ${networkInfo.name} (${networkInfo.chainId}). Expected: ${TARGET_NETWORK_NAME} (${TARGET_NETWORK_CHAIN_ID}).`);
        setTxError(`Wrong Network: Please switch to ${TARGET_NETWORK_NAME}.`);
      } else {
        console.log(`[TipForm] Correct network detected: ${TARGET_NETWORK_NAME}`);
        setTxError(prev => prev === `Wrong Network: Please switch to ${TARGET_NETWORK_NAME}.` ? null : prev);
      }
    } catch (error) {
      console.error("[TipForm] Could not get network info:", error);
      setNetwork(null);
      setTxError("Could not read network information from Metamask.");
      setTxStatus(TxStatus.Error);
    }
  }, [toast]);

  // --- Effects ---
  // Effect 1: Initialize Provider and Check Metamask
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      setIsMetamaskInstalled(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum, 'any');
      setProvider(browserProvider);
      console.log('[TipForm] Provider initialized');
    } else {
      setIsMetamaskInstalled(false);
      console.error('[TipForm] MetaMask is not installed.');
    }
  }, []);

  // Effect 2: Get Initial Network and Account Info
  useEffect(() => {
    if (provider) {
      console.log('[TipForm] Provider ready, getting initial network and account...');
      updateNetwork(provider);
      provider.listAccounts().then(async (accounts) => {
        if (accounts.length > 0 && accounts[0]) {
          const initialAccount = accounts[0].address;
          setAccount(initialAccount);
          try {
            const initialSigner = await provider.getSigner(initialAccount);
            setSigner(initialSigner);
            console.log('[TipForm] Initial account/signer set:', initialAccount);
          } catch (err) {
            console.error("[TipForm] Error getting initial signer:", err);
            setSigner(null);
          }
        } else {
          console.log('[TipForm] No initial account found connected.');
          setAccount(null);
          setSigner(null);
        }
      }).catch(err => {
        console.error("[TipForm] Error listing initial accounts:", err);
        setAccount(null);
        setSigner(null);
      });
    }
  }, [provider, updateNetwork]);

  // Effect 3: Setup Event Listeners
  useEffect(() => {
    const eth = window.ethereum;
    if (provider && eth) {
      console.log('[TipForm] Setting up event listeners');
      const handleChainChanged = (_chainId: string) => {
        console.log('[TipForm] Network changed event detected:', _chainId);
        setTxStatus(TxStatus.Idle);
        setTxHash(null);
        updateNetwork(provider); // Re-check network
        setSigner(null);
        setAccount(null);
        setTipJarContract(null);
        setTxError('Network changed. Please connect wallet again.');
        toast({ title: "Network Changed", description: "Please reconnect your wallet for the new network.", variant: "default" });
      };
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('[TipForm] Accounts changed event detected:', accounts);
        const newAccount = accounts.length > 0 ? accounts[0] : null;
        if (!newAccount) {
          setAccount(null);
          setSigner(null);
          setTipJarContract(null);
          setTxStatus(TxStatus.Idle);
          setTxError('Wallet disconnected or locked. Please connect again.');
          toast({ title: "Wallet Disconnected", variant: "destructive" });
        } else {
          setAccount(newAccount);
          provider.getSigner(newAccount).then(newSigner => {
            setSigner(newSigner);
            setTxError(null);
            console.log("[TipForm] Account switched, signer updated:", newAccount);
            toast({ title: "Account Switched", description: `Connected to ${newAccount}` });
          }).catch(err => {
            console.error("[TipForm] Error getting signer for new account:", err);
            setSigner(null);
            setTipJarContract(null);
            setTxError("Could not get signer for the selected account.");
            setTxStatus(TxStatus.Error);
          });
        }
      };
      eth.on('chainChanged', handleChainChanged);
      eth.on('accountsChanged', handleAccountsChanged);
      return () => {
        console.log('[TipForm] Cleaning up event listeners');
        eth.removeListener('chainChanged', handleChainChanged);
        eth.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [provider, updateNetwork, toast]);

  // Effect 4: Create Contract Instance
  useEffect(() => {
    console.log('[TipForm] Attempting to create contract instance...');
    console.log(`[TipForm]   - Contract Address: ${TIP_JAR_CONTRACT_ADDRESS}`);
    console.log(`[TipForm]   - Signer available: ${!!signer}`);
    console.log(`[TipForm]   - Network available: ${!!network}`);
    console.log(`[TipForm]   - Network Chain ID: ${network?.chainId}`);
    console.log(`[TipForm]   - Target Chain ID: ${TARGET_NETWORK_CHAIN_ID}`);
    console.log(`[TipForm]   - Is correct network: ${network?.chainId === TARGET_NETWORK_CHAIN_ID}`);

    // Only proceed if essentials are present
    if (signer && network?.chainId === TARGET_NETWORK_CHAIN_ID && isAddress(TIP_JAR_CONTRACT_ADDRESS)) { 
      try {
        const contract = new ethers.Contract(TIP_JAR_CONTRACT_ADDRESS, TipJarABI, signer);
        setTipJarContract(contract);
        console.log('[TipForm] TipJar Contract instance CREATED successfully:', contract.target);
        // Clear wrong network error ONLY if it was the specific reason
        setTxError(prev => prev === `Wrong Network: Please switch to ${TARGET_NETWORK_NAME}.` ? null : prev);
      } catch (error) {
        console.error("[TipForm] FAILED to create contract instance:", error);
        setTipJarContract(null);
        setTxError("Failed to initialize contract. Check address/ABI or console.");
        setTxStatus(TxStatus.Error);
      }
    } else {
      // Conditions not met, ensure contract instance is null
      if (tipJarContract) { // Only log if we are clearing an existing instance
          console.log('[TipForm] Clearing existing contract instance (conditions not met).');
          setTipJarContract(null); 
      }
      // Set specific errors if applicable
      if (!isAddress(TIP_JAR_CONTRACT_ADDRESS)){
           console.error("[TipForm] Invalid contract address configured in TipForm.");
           setTxError("Configuration Error: Invalid Contract Address.");
      } else if (network && network.chainId !== TARGET_NETWORK_CHAIN_ID && signer) {
           console.log('[TipForm] Setting wrong network error because network mismatch detected.');
          setTxError(`Wrong Network: Please switch to ${TARGET_NETWORK_NAME}.`);
      }
    }
  // Include TIP_JAR_CONTRACT_ADDRESS in dependency array if it could ever change (though it's a const here)
  }, [signer, network]); 


  // --- Wallet/Transaction Functions ---
  const connectWallet = async (): Promise<Signer | null> => {
    if (!provider) {
      setTxError('Metamask provider not initialized.');
      setTxStatus(TxStatus.Error);
      return null;
    }
    setTxStatus(TxStatus.Connecting);
    setTxError(null);
    setTxHash(null);
    try {
      toast({ title: "Connecting Wallet", description: "Please approve the connection in Metamask." });
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) throw new Error("No accounts approved.");
      
      await new Promise(resolve => setTimeout(resolve, 200)); 
      await updateNetwork(provider); 

      const currentSigner = await provider.getSigner(accounts[0]);
      setSigner(currentSigner);
      setAccount(accounts[0]);
      console.log('[TipForm] Wallet connected successfully:', accounts[0]);
      setTxStatus(TxStatus.Idle);
      return currentSigner;
    } catch (err: any) {
      console.error('[TipForm] Failed to connect wallet:', err);
      let connectError = `Failed to connect: ${err.message || 'Unknown error'}`;
       if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
            connectError = 'Connection request rejected.';
        }
      setTxError(connectError);
      setTxStatus(TxStatus.Error);
      setAccount(null);
      setSigner(null);
      setTipJarContract(null);
      toast({ title: "Connection Failed", description: connectError, variant: "destructive" });
      return null;
    }
  };

  const handleSubmitWithMetamask = async (e: React.FormEvent) => {
    e.preventDefault();
    // Reset errors relevant to submission but keep connection errors
    if (txError !== `Wrong Network: Please switch to ${TARGET_NETWORK_NAME}.`) {
         setTxError(null);
    }
    setTxStatus(TxStatus.Idle);
    setTxHash(null);

    console.log('[TipForm] handleSubmitWithMetamask called.');

    // --- Validations ---
    if (!selectedStaff) {
      setTxError('Please select a staff member.');
      setTxStatus(TxStatus.Error);
      return;
    }
    if (!amount || amount <= 0) {
      setTxError('Please enter a valid tip amount (> 0).');
      setTxStatus(TxStatus.Error);
      return;
    }
    if (!isMetamaskInstalled || !provider) {
      setTxError('Metamask is not available.');
      setTxStatus(TxStatus.Error);
      return;
    }
    if (network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
      setTxError(`Wrong Network: Please switch Metamask to ${TARGET_NETWORK_NAME}.`);
      setTxStatus(TxStatus.Error);
      toast({ title: "Wrong Network", description: `Switch Metamask to ${TARGET_NETWORK_NAME} to send tips.`, variant: "destructive" });
      return;
    }
    if (!TIP_JAR_CONTRACT_ADDRESS || !isAddress(TIP_JAR_CONTRACT_ADDRESS)) {
      setTxError('Configuration Error: Invalid Contract Address.');
      setTxStatus(TxStatus.Error);
      console.error("TipForm.tsx: TIP_JAR_CONTRACT_ADDRESS is invalid or missing.");
      return;
    }

    // Find the staff member's address
    const staffMember = staffData.find(staff => staff.name === selectedStaff);
    if (!staffMember || !staffMember.address || !isAddress(staffMember.address)) {
        setTxError(`Invalid or missing wallet address for ${selectedStaff} in staffs.json.`);
        setTxStatus(TxStatus.Error);
        console.error(`[TipForm] Address issue for ${selectedStaff}:`, staffMember?.address);
        return;
    }
    const staffWalletAddress = staffMember.address;

    let currentSigner = signer;
    let currentContract = tipJarContract;

    // 1. Connect Wallet & Ensure Contract Instance if necessary
    if (!currentSigner || !account) {
        console.log('[TipForm] Signer or account missing, attempting to connect wallet...');
        currentSigner = await connectWallet();
        if (!currentSigner) {
            console.log('[TipForm] Wallet connection failed during submit.');
            return; 
        }
        // Give Effect 4 a moment to potentially create the contract after connection
        await new Promise(resolve => setTimeout(resolve, 300)); 
        currentContract = tipJarContract; // Re-check contract state after potential connection
    }
    
    // Re-check contract instance AFTER potential connection attempt
    if (!currentContract) {
         console.error("[TipForm] Contract instance still null before sending transaction.");
         // Try to recreate if conditions seem right (handle timing race condition)
         if(signer && network?.chainId === TARGET_NETWORK_CHAIN_ID && isAddress(TIP_JAR_CONTRACT_ADDRESS)) {
            console.log("[TipForm] Attempting to recreate contract instance manually during submit...");
             try {
                currentContract = new ethers.Contract(TIP_JAR_CONTRACT_ADDRESS, TipJarABI, signer);
                setTipJarContract(currentContract); // Update state too
                console.log("[TipForm] Manual contract creation successful.");
             } catch (err) {
                 console.error("[TipForm] Manual contract creation failed:", err);
                 setTxError(`Contract Error: Failed to initialize. Check console.`);
                 setTxStatus(TxStatus.Error);
                 return; // Don't proceed
             }
         } else {
              setTxError(`Contract Not Ready: Ensure wallet connected to ${TARGET_NETWORK_NAME}.`);
              setTxStatus(TxStatus.Error);
              return; // Don't proceed if contract couldn't be initialized
         }
    }

    // 2. Call Smart Contract Function
    setTxStatus(TxStatus.Sending);
    try {
      const tipAmountWei = ethers.parseEther(amount.toString());
      
      console.log(`[TipForm] Calling contract function 'sendTip' on ${currentContract.target} for staff: ${selectedStaff} (${staffWalletAddress}), message: ${name}, amount: ${amount} ETH...`);
      toast({ title: "Sending Tip", description: "Please confirm transaction in Metamask." });

      const tx: TransactionResponse = await currentContract.sendTip(
        staffWalletAddress,
        selectedStaff,
        name || 'Anonymous',
        { value: tipAmountWei }
      );

      console.log('[TipForm] Contract transaction submitted! Hash:', tx.hash);
      setTxHash(tx.hash);
      setTxStatus(TxStatus.Mining);
      toast({ title: "Transaction Mining", description: `Waiting for confirmation... Hash: ${tx.hash}` });

      // 3. Wait for Confirmation
      const receipt: TransactionReceipt | null = await tx.wait(1); 
      console.log('[TipForm] Transaction receipt:', receipt);

      if (receipt && receipt.status === 1) {
        console.log('[TipForm] Transaction confirmed successfully!');
        setTxStatus(TxStatus.Success);
        toast({ title: "Tip Sent Successfully!", description: `Sent ${amount} ETH directly to ${selectedStaff}. Hash: ${tx.hash}` });
      } else {
        // Transaction failed on-chain
        console.error('[TipForm] Transaction failed on-chain. Status:', receipt?.status);
        throw new Error(`Transaction failed or reverted on-chain. Status: ${receipt?.status ?? 'N/A'}`);
      }

    } catch (err: any) {
        console.error('[TipForm] Transaction process failed:', err);
        let userFriendlyError = `Transaction failed: ${err.reason || err.message || 'Unknown error'}`;
        
        // Refined error handling
        if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
            userFriendlyError = 'Transaction rejected in Metamask.';
        } else if (err.code === 'INSUFFICIENT_FUNDS') {
            userFriendlyError = 'Insufficient funds for transaction.';
        } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT' || err.code === 'CALL_EXCEPTION') {
            if (err.reason?.includes("Tip amount must be greater than zero")) {
                 userFriendlyError = "Tip amount must be greater than zero.";
            } else if (err.reason?.includes("Invalid staff address")) {
                 userFriendlyError = "Contract Error: Invalid staff address provided.";
            } else if (err.reason?.includes("ETH transfer failed")) {
                 userFriendlyError = "Contract Error: Failed to transfer ETH to staff. (Check recipient address or contract logic)";
            } else {
                userFriendlyError = `Transaction Reverted: ${err.reason || 'Check contract logic/inputs.'}`;
            }
        } else if (err.message?.includes('Transaction failed or reverted')) {
            // Catch the error thrown after tx.wait()
            userFriendlyError = err.message;
        }
      
        setTxError(userFriendlyError);
        setTxStatus(TxStatus.Error);
        setTxHash(prevHash => err?.transaction?.hash ?? err?.hash ?? prevHash ?? null); // Capture hash if available

        // Avoid double toast if user just rejected
        if (err.code !== 4001 && err.code !== 'ACTION_REJECTED') {
             toast({ title: "Transaction Failed", description: userFriendlyError, variant: "destructive" });
        }
    }
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount);
  };

  // --- UI Rendering ---
  const getButtonState = (): { text: string; disabled: boolean; statusText?: string } => {
    const isProcessing = txStatus === TxStatus.Connecting || txStatus === TxStatus.Sending || txStatus === TxStatus.Mining;
    let text = `Send Tip to ${selectedStaff || 'Staff'}`;
    let disabled = false;
    let statusText = ""; 

    if (!isMetamaskInstalled) {
        text = "Metamask Not Installed";
        disabled = true;
    } else if (!provider) {
        text = "Initializing Provider...";
        disabled = true;
    } else if (!account || !signer) {
        text = 'Connect Wallet'; 
        disabled = isProcessing; 
    } else if (network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
        text = `Switch to ${TARGET_NETWORK_NAME}`;
        disabled = true;
        statusText = `Please switch network in Metamask.`;
    } else if (!tipJarContract) {
        // Check if the address itself is the problem
        if (!isAddress(TIP_JAR_CONTRACT_ADDRESS)){
             text = "Config Error";
             statusText = "Invalid contract address set.";
        } else {
             text = `Initializing Contract...`; 
             statusText = `Waiting for contract connection on ${TARGET_NETWORK_NAME}...`;
        }
        disabled = true;
    } else {
        // Wallet connected, right network, contract initialized
        text = `Send Tip to ${selectedStaff || 'Staff'}`; 
        disabled = isProcessing; 
        
        // Check staff address validity only if we are ready to send
        const staffMember = staffData.find(staff => staff.name === selectedStaff);
        if (!staffMember || !staffMember.address || !isAddress(staffMember.address)) {
            text = 'Invalid Staff Address';
            disabled = true;
            statusText = `Cannot send: Address for ${selectedStaff || 'selected staff'} is invalid in staffs.json.`;
        }

        // Override text/disable based on transaction status
        if (txStatus === TxStatus.Connecting) {
            text = 'Connecting...';
            disabled = true;
        } else if (txStatus === TxStatus.Sending) {
            text = 'Check Metamask...';
            disabled = true;
        } else if (txStatus === TxStatus.Mining) {
            text = 'Mining Transaction...';
            disabled = true;
        } else if (txStatus === TxStatus.Success) {
            text = 'Tip Sent!';
            disabled = false; 
        } else if (txStatus === TxStatus.Error) {
            text = 'Submit Tip Failed - Try Again';
            disabled = isProcessing; 
        }
    }

    return { text, disabled, statusText };
  };

  const buttonState = getButtonState();
  const etherscanBaseUrl = network ? getEtherscanBaseUrl(network.chainId) : '#';

  // Separate handler for the button click
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!account || !signer) {
        e.preventDefault(); // Prevent form submission if we're just connecting
        connectWallet();
    }
    // If button is for switching network or shows error, prevent submission
    else if (buttonState.disabled && buttonState.text !== 'Check Metamask...' && buttonState.text !== 'Mining Transaction...') {
        e.preventDefault();
    }
    // Otherwise, let the form onSubmit={handleSubmitWithMetamask} handle it
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Tip {selectedStaff || 'Staff Member'} Directly</h2>
      <p className="text-xs text-gray-500 mb-3">Contract: <code className="bg-gray-100 p-1 rounded break-all">{TIP_JAR_CONTRACT_ADDRESS}</code> on {TARGET_NETWORK_NAME}</p>
      
      <form onSubmit={handleSubmitWithMetamask} className="flex flex-col space-y-4">
        {/* Inputs */} 
        <div>
          <Label htmlFor="name">Your Name / Message (Optional)</Label>
          <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name or a message" disabled={buttonState.disabled && buttonState.text !== 'Connect Wallet'}/>
        </div>
        <div>
          <Label htmlFor="amount">Tip Amount (ETH)</Label> 
          <div className="flex flex-wrap gap-2 mt-1">
            {[0.01, 0.02, 0.05].map(preset => (
              <Button key={preset} type="button" variant="outline" onClick={() => handlePresetAmount(preset)} disabled={buttonState.disabled && buttonState.text !== 'Connect Wallet'}>{preset}</Button>
            ))}
            <Input className="flex-1 min-w-[150px]" id="amount" type="number" placeholder="Custom Amount (ETH)" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} step="any" min="0.000001" required disabled={buttonState.disabled && buttonState.text !== 'Connect Wallet'}/>
          </div>
        </div>

        {/* Metamask/Network Info */} 
        {!isMetamaskInstalled && <p className="text-red-600 text-sm font-medium">Metamask is not installed.</p>}
        {provider && account && (
            <p className="text-sm text-gray-600">Connected: <code className="text-xs bg-gray-100 p-1 rounded break-all">{account}</code>{network ? ` on ${network.name} (${network.chainId})` : ' (Network unknown)'}</p>
        )}
        {provider && !account && txStatus !== TxStatus.Connecting && <p className="text-orange-600 text-sm">Wallet not connected.</p>}
        {network && network.chainId !== TARGET_NETWORK_CHAIN_ID && account && (
             <p className="text-orange-600 text-sm font-semibold">Please switch Metamask to {TARGET_NETWORK_NAME} network.</p>
        )}
        {/* Display status text below connection info */} 
        {buttonState.statusText && <p className="text-sm text-orange-600 mt-1">{buttonState.statusText}</p>} 

        {/* Submit Button */} 
        <Button type="submit" disabled={buttonState.disabled} onClick={handleButtonClick}>{buttonState.text}</Button>

        {/* Error Display */} 
        {/* Ensure txError is displayed clearly */} 
        {txStatus === TxStatus.Error && txError && (
            <p className="text-red-600 text-sm mt-2 break-words font-semibold">Error: {txError}</p>
        )}

        {/* Transaction Info Display */} 
        {txHash && (
           <div className={`mt-4 p-3 border rounded text-sm ${txStatus === TxStatus.Success ? 'border-green-500 bg-green-50' : (txStatus === TxStatus.Error ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50')}`}>
            {txStatus === TxStatus.Mining && <p className="font-medium text-blue-700">Transaction mining on {network?.name ?? 'network'}...</p>} 
            {txStatus === TxStatus.Success && <p className="font-medium text-green-700">Tip Sent Directly!</p>} 
            {/* Only show specific tx error if status is error AND we have a txError */} 
            {txStatus === TxStatus.Error && txError && <p className="font-medium text-red-700">Transaction Failed</p>} 
            
             <p className="mt-1">Tx Hash: <code className="text-xs ${txStatus === TxStatus.Success ? 'text-green-800 bg-green-100' : (txStatus === TxStatus.Error ? 'text-red-800 bg-red-100' : 'text-blue-800 bg-blue-100')} p-1 rounded break-all block sm:inline">{txHash}</code></p>
            {etherscanBaseUrl !== '#' && network && (
                <a 
                  href={`${etherscanBaseUrl}/tx/${txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                >
                  View on Block Explorer ({network.name})
                </a>
            )}
             <p className="text-xs mt-1 text-gray-600">Note: Tip sent via TipJar contract: {TIP_JAR_CONTRACT_ADDRESS}</p>
          </div>
        )}

      </form>
    </div>
  );
};

export default TipForm;
