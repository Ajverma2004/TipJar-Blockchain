'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers, TransactionResponse, TransactionReceipt, Network, BrowserProvider, Signer, Contract } from 'ethers'; // Import Contract
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import TipJarABI from '@/abi/TipJar.json'; // Import the ABI

// --- !!! IMPORTANT: Replace with YOUR deployed contract address !!! ---
const TIP_JAR_CONTRACT_ADDRESS = '0x428b38aFF7D06d10A55639B08C8c22f76A851ACE'; 
// ------------------------------------------------------------------

enum TxStatus {
  Idle,
  Connecting,
  Sending, 
  Mining, 
  Success,
  Error
}

interface TipFormProps {
  // Remove the original onSubmit if it's no longer needed for non-contract actions
  // onSubmit: (name: string, phone: string, amount: number) => void; 
  selectedStaff: string;
}

// Helper function to get Etherscan base URL
const getEtherscanBaseUrl = (chainId: bigint): string => {
  switch (chainId) {
    case 1n: return 'https://etherscan.io';
    case 5n: return 'https://goerli.etherscan.io';
    case 11155111n: return 'https://sepolia.etherscan.io';
    case 84532n: return 'https://sepolia.basescan.org'; // Base Sepolia
    default: return 'https://etherscan.io';
  }
};

const TipForm: React.FC<TipFormProps> = ({ selectedStaff }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // Keep if needed for other purposes, otherwise remove
  const [amount, setAmount] = useState<number | '' > ('');

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
      console.log('Connected Network:', networkInfo);
      // Check if connected network matches expected deployment network (optional but recommended)
      if (networkInfo.chainId !== 84532n) { // 84532n is Base Sepolia
          // toast({ title: "Wrong Network", description: `Please switch Metamask to Base Sepolia (Chain ID 84532). Contract is deployed there.`, variant: "destructive" });
          // Consider setting an error state or disabling the form
          console.warn(`Connected to ${networkInfo.name} (${networkInfo.chainId}), but contract is expected on Base Sepolia (84532).`);
          setTxError(`Wrong Network: Please switch to Base Sepolia.`);
          // Don't reset the network state itself, just show error
      } else {
          // Clear wrong network error if user switches back
          setTxError(prev => prev === `Wrong Network: Please switch to Base Sepolia.` ? null : prev);
      }
    } catch (error) {
      console.error("Could not get network info:", error);
      setNetwork(null);
      setTxError("Could not read network information from Metamask.");
      setTxStatus(TxStatus.Error);
    }
  }, [toast]); // Add toast to dependencies

  // --- Effects (Initialization, Network/Account Handling) ---
  // (Effects 1, 2, 3 for provider init, network/account updates, and listeners remain largely the same as before)
  // ... (Keep the useEffect hooks from the previous corrected version) ...
    // Effect 1: Initialize Provider and Check Metamask on Mount
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      setIsMetamaskInstalled(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum, 'any'); // 'any' allows network changes
      setProvider(browserProvider);
      console.log('Provider initialized');
    } else {
      setIsMetamaskInstalled(false);
      console.error('MetaMask is not installed.');
    }
  }, []); // Runs only once on mount

  // Effect 2: Get Initial Network and Account Info when Provider is ready
  useEffect(() => {
    if (provider) {
        console.log('Provider ready, getting initial network and account...');
        updateNetwork(provider); // Update network info
        // Get initial account/signer info
        provider.listAccounts().then(async (accounts) => {
             if (accounts.length > 0 && accounts[0]) {
                const initialAccount = accounts[0].address;
                setAccount(initialAccount);
                 try {
                    const initialSigner = await provider.getSigner(initialAccount);
                    setSigner(initialSigner);
                    console.log('Initial account/signer set:', initialAccount);
                } catch (err) {
                    console.error("Error getting initial signer:", err);
                    setSigner(null); // Ensure signer is null if error occurs
                }
            } else {
                 console.log('No initial account found connected.');
                 setAccount(null);
                 setSigner(null);
            }
        }).catch(err => {
            console.error("Error listing initial accounts:", err);
            setAccount(null);
            setSigner(null);
        });
    }
  }, [provider, updateNetwork]); // Runs when provider is ready

  // Effect 3: Setup Event Listeners
  useEffect(() => {
    const eth = window.ethereum;
    if (provider && eth) {
      console.log('Setting up event listeners');

      const handleChainChanged = (_chainId: string) => {
        console.log('Network changed event detected:', _chainId);
        setTxStatus(TxStatus.Idle);
        setTxHash(null);
        updateNetwork(provider); // Re-check network
        // Reset signer and contract instance, prompt re-connect if needed
        setSigner(null);
        setAccount(null);
        setTipJarContract(null);
        setTxError('Network changed. Please connect wallet again.');
        toast({ title: "Network Changed", description: "Please reconnect your wallet for the new network.", variant: "default" });
      };

      const handleAccountsChanged = (accounts: string[]) => {
        console.log('Accounts changed event detected:', accounts);
        const newAccount = accounts.length > 0 ? accounts[0] : null;
         if (!newAccount) {
            setAccount(null);
            setSigner(null);
            setTipJarContract(null);
            setTxStatus(TxStatus.Idle);
            setTxError('Wallet disconnected or locked. Please connect again.');
            toast({ title: "Wallet Disconnected", variant: "destructive" });
        } else {
            setAccount(newAccount); // Update account state
             // Get new signer for the switched account
            provider.getSigner(newAccount).then(newSigner => {
                setSigner(newSigner);
                 setTxError(null); // Clear previous errors on successful account switch
                 console.log("Account switched, signer updated:", newAccount);
                 toast({ title: "Account Switched", description: `Connected to ${newAccount}` });
            }).catch(err => {
                 console.error("Error getting signer for new account:", err);
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
        console.log('Cleaning up event listeners');
        eth.removeListener('chainChanged', handleChainChanged);
        eth.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [provider, updateNetwork, toast]); // Add toast dependency

  // Effect 4: Create Contract Instance when Signer and Network are ready
  useEffect(() => {
    if (signer && network?.chainId === 84532n) { // Only create contract if signer exists and network is Base Sepolia
        try {
             const contract = new ethers.Contract(TIP_JAR_CONTRACT_ADDRESS, TipJarABI, signer);
             setTipJarContract(contract);
             console.log('TipJar Contract instance created:', contract.target);
             // Clear wrong network error if we successfully create contract
             setTxError(prev => prev === `Wrong Network: Please switch to Base Sepolia.` ? null : prev);
        } catch (error) {
            console.error("Failed to create contract instance:", error);
            setTipJarContract(null);
            setTxError("Failed to initialize contract. Check address/ABI.");
            setTxStatus(TxStatus.Error);
        }
    } else {
        setTipJarContract(null); // Clear contract instance if signer or network is wrong/missing
        if (network && network.chainId !== 84532n && signer) {
             setTxError(`Wrong Network: Please switch to Base Sepolia.`);
        }
    }
  }, [signer, network]); // Dependency on signer and network


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
      
      await updateNetwork(provider); // Update network info after connection
      const currentSigner = await provider.getSigner(accounts[0]);
      setSigner(currentSigner);
      setAccount(accounts[0]); 
      console.log('Wallet connected:', accounts[0]);
      setTxStatus(TxStatus.Idle); 
      return currentSigner;
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      let connectError = `Failed to connect: ${err.message || 'Unknown error'}`;
       if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
            connectError = 'Connection request rejected.';
        }
      setTxError(connectError);
      setTxStatus(TxStatus.Error);
      setAccount(null);
      setSigner(null);
      setTipJarContract(null); // Clear contract instance on connection error
      toast({ title: "Connection Failed", description: connectError, variant: "destructive" });
      return null;
    }
  };

  // MODIFIED: Handle interaction with the TipJar smart contract
  const handleSubmitWithMetamask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    setTxStatus(TxStatus.Idle);
    setTxHash(null);

    // --- Validations ---
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
     if (network?.chainId !== 84532n) {
        setTxError(`Wrong Network: Please switch Metamask to Base Sepolia (84532).`);
        setTxStatus(TxStatus.Error);
        toast({ title: "Wrong Network", description: "Switch Metamask to Base Sepolia to send tips.", variant: "destructive" });
        return;
    }
     if (!TIP_JAR_CONTRACT_ADDRESS || TIP_JAR_CONTRACT_ADDRESS === 'YOUR_DEPLOYED_CONTRACT_ADDRESS') {
         setTxError('Contract Address is not set in the code!');
         setTxStatus(TxStatus.Error);
         console.error("TipForm.tsx: TIP_JAR_CONTRACT_ADDRESS is not set.");
         return;
     }

    let currentSigner = signer;
    let currentContract = tipJarContract;

    // 1. Connect Wallet & Ensure Contract Instance if necessary
    if (!currentSigner || !account) {
        currentSigner = await connectWallet();
        if (!currentSigner) return; 
        // The contract instance should be created by Effect 4 when signer updates
        // We wait a tiny bit for state update, though Effect 4 is the robust way
        await new Promise(resolve => setTimeout(resolve, 100)); 
        currentContract = tipJarContract; // Re-check contract state after potential connection
    }
    
    // Check contract instance *after* potential connection attempt
    if (!currentContract) {
         setTxError('TipJar contract not initialized. Ensure you are connected to Base Sepolia.');
         setTxStatus(TxStatus.Error);
         console.error("Contract instance is null before sending transaction.");
         return;
    }

    // 2. Call Smart Contract Function
    setTxStatus(TxStatus.Sending);
    try {
        const tipAmountWei = ethers.parseEther(amount.toString());
        
        console.log(`Calling contract function 'sendTip' on ${currentContract.target} with staff: ${selectedStaff}, message: ${name}, amount: ${amount} ETH...`);
        toast({ title: "Sending Tip to Contract", description: "Please confirm the transaction in Metamask." });

        // --- Call the contract --- 
        const tx: TransactionResponse = await currentContract.sendTip(
            selectedStaff,    // Argument 1: _staffName (string)
            name || 'Anonymous', // Argument 2: _message (string) - Use name field, default to 'Anonymous'
            { value: tipAmountWei } // Send ETH along with the call
        );
        // ------------------------- 

        console.log('Contract transaction submitted! Hash:', tx.hash);
        setTxHash(tx.hash);
        setTxStatus(TxStatus.Mining);
        toast({ title: "Transaction Mining", description: `Waiting for confirmation... Hash: ${tx.hash}` });

        // 3. Wait for Confirmation
        const receipt: TransactionReceipt | null = await tx.wait(1); 
        console.log('Transaction receipt:', receipt);

        if (receipt && receipt.status === 1) {
            console.log('Transaction confirmed successfully!');
            setTxStatus(TxStatus.Success);
            toast({ title: "Tip Sent Successfully!", description: `Sent ${amount} ETH via TipJar contract. Hash: ${tx.hash}` });
            // Clear form or give other success feedback
            // setAmount(''); 
            // setName('');
            // Note: Original onSubmit is removed unless needed for non-blockchain tasks
            // onSubmit(name, phone, Number(amount)); 

        } else {
            throw new Error(`Transaction failed or reverted on-chain. Status: ${receipt?.status ?? 'N/A'}`);
        }

    } catch (err: any) {
        // ... (Keep the existing detailed error handling catch block) ...
         console.error('Transaction process failed:', err);
        let userFriendlyError = `Transaction failed: ${err.message || 'Unknown error'}`;
         if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
            userFriendlyError = 'Transaction rejected in Metamask.';
        } else if (err.code === 'INSUFFICIENT_FUNDS') {
            userFriendlyError = 'Insufficient funds for transaction.';
        } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
             userFriendlyError = 'Cannot estimate gas. Transaction may fail or require manual gas limit.';
        } else if (err.code === 'CALL_EXCEPTION') {
             userFriendlyError = 'Transaction failed during contract execution (reverted). Check contract logic or inputs.';
        } 
        
        setTxError(userFriendlyError);
        setTxStatus(TxStatus.Error);
        // Attempt to keep the hash if the transaction was at least submitted
        setTxHash(prevHash => err?.transaction?.hash ?? prevHash ?? null); 

        // Avoid double toast if user just rejected
        if (err.code !== 4001 && err.code !== 'ACTION_REJECTED') {
             toast({ title: "Transaction Failed", description: userFriendlyError, variant: "destructive" });
        }
    }
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount);
  };

  // --- UI Rendering (Button state needs slight adjustment) ---

  const getButtonState = (): { text: string; disabled: boolean } => {
    const isProcessing = txStatus === TxStatus.Connecting || txStatus === TxStatus.Sending || txStatus === TxStatus.Mining;
    let text = 'Send Tip via Contract';
    // Disable if processing, not installed, provider missing, OR contract instance missing/wrong network
    let disabled = isProcessing || !isMetamaskInstalled || !provider || !tipJarContract || network?.chainId !== 84532n;

    if (!signer || !account) {
        text = 'Connect Wallet & Submit Tip';
        disabled = isProcessing || !isMetamaskInstalled || !provider;
    } else if (network?.chainId !== 84532n) {
        text = 'Switch to Base Sepolia';
        disabled = true; // Disabled because wrong network
    } else if (txStatus === TxStatus.Connecting) {
        text = 'Connecting...';
        disabled = true;
    } else if (txStatus === TxStatus.Sending) {
        text = 'Check Metamask...';
        disabled = true;
    } else if (txStatus === TxStatus.Mining) {
        text = 'Mining Transaction...';
        disabled = true;
    } else if (txStatus === TxStatus.Success) {
        text = 'Tip Sent Successfully!';
        disabled = false; // Re-enable for next tip
    } else if (txStatus === TxStatus.Error) {
        // Use connect text if signer is missing, otherwise Try Again
        text = (!signer || !account) ? 'Connect Wallet & Submit' : 'Try Again';
        // Disable Try Again if still processing or provider missing, or contract issue
        disabled = isProcessing || !isMetamaskInstalled || !provider || (!signer && !account); 
        // Keep enabled even if contract has issues if signer is present, allowing re-connection attempt
    }
    
    return { text, disabled };
  };

  const buttonState = getButtonState();
  const etherscanBaseUrl = network ? getEtherscanBaseUrl(network.chainId) : '#';

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Tip {selectedStaff} (via Smart Contract)</h2>
      {/* Display Contract Address for reference */} 
      {TIP_JAR_CONTRACT_ADDRESS !== 'YOUR_DEPLOYED_CONTRACT_ADDRESS' && (
          <p className="text-xs text-gray-500 mb-3">Contract: <code className="bg-gray-100 p-1 rounded">{TIP_JAR_CONTRACT_ADDRESS}</code> on Base Sepolia</p>
      )}
       {TIP_JAR_CONTRACT_ADDRESS === 'YOUR_DEPLOYED_CONTRACT_ADDRESS' && (
           <p className="text-xs text-red-500 mb-3">Error: Contract address not set in TipForm.tsx!</p>
       )}

      <form onSubmit={handleSubmitWithMetamask} className="flex flex-col space-y-4">
        {/* Input Fields (Name is now used as message) */} 
        <div>
          <Label htmlFor="name">Your Name / Message (Optional)</Label>
          <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name or a message" disabled={buttonState.disabled}/>
        </div>
        {/* Phone field might be removed if not used */}
         {/* <div>
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <Input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" disabled={buttonState.disabled}/>
        </div> */} 
        <div>
          <Label htmlFor="amount">Tip Amount (ETH)</Label> 
          <div className="flex flex-wrap gap-2 mt-1">
            {[0.01, 0.02, 0.05].map(preset => (
              <Button key={preset} type="button" variant="outline" onClick={() => handlePresetAmount(preset)} disabled={buttonState.disabled}>{preset}</Button>
            ))}
            <Input className="flex-1 min-w-[150px]" id="amount" type="number" placeholder="Custom Amount (ETH)" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} step="any" min="0.00001" required disabled={buttonState.disabled}/>
          </div>
        </div>

        {/* Metamask/Network Info */} 
        {!isMetamaskInstalled && <p className="text-red-600 text-sm font-medium">Metamask is not installed.</p>}
        {provider && account && (
            <p className="text-sm text-gray-600">Connected: <code className="text-xs bg-gray-100 p-1 rounded">{account}</code>{network ? ` on ${network.name} (${network.chainId})` : ' (Network unknown)'}</p>
        )}
        {provider && !account && txStatus !== TxStatus.Connecting && <p className="text-orange-600 text-sm">Wallet not connected.</p>}
        {network && network.chainId !== 84532n && account && (
             <p className="text-orange-600 text-sm font-semibold">Please switch Metamask to Base Sepolia network.</p>
        )}
        
        {/* Submit Button */} 
        <Button type="submit" disabled={buttonState.disabled}>{buttonState.text}</Button>

        {/* Error Display */} 
        {txStatus === TxStatus.Error && txError && (
            <p className="text-red-500 text-sm mt-2 break-words">Error: {txError}</p>
        )}

        {/* Transaction Info Display (Adjusted for Contract Interaction) */} 
        {txHash && (
          <div className={`mt-2 p-3 border rounded text-sm ${txStatus === TxStatus.Success ? 'border-green-500 bg-green-50' : (txStatus === TxStatus.Error ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50')}`}>
            {txStatus === TxStatus.Mining && <p className="font-medium text-blue-700">TipJar transaction is mining on {network?.name ?? 'network'}...</p>} 
            {txStatus === TxStatus.Success && <p className="font-medium text-green-700">Tip Sent Successfully via Contract!</p>} 
            {txStatus === TxStatus.Error && txError?.includes('on-chain') && <p className="font-medium text-red-700">Transaction Failed On-Chain</p>} 
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
