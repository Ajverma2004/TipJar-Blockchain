'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

// Contract Address - Ensure this matches TipForm.tsx
const TIP_JAR_CONTRACT_ADDRESS = '0x428b38aFF7D06d10A55639B08C8c22f76A851ACE'; 

// Interface for the payment data
interface Payment {
  id: string; 
  tipper: string;
  staffName: string;
  message: string;
  amount: string; 
  transactionHash: string;
  timestamp: number; 
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

// Skeleton Loader Component for Payments List
const PaymentListSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-4 border rounded-lg shadow-sm bg-white flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-24" /> 
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full" /> 
        <Skeleton className="h-4 w-3/4" />
         <Skeleton className="h-4 w-full mt-1" />
      </div>
    ))}
  </div>
);

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Fetching payment history via /api/payments...");
    const fetchPayments = async () => {
      setIsLoading(true);
      setError(null);
      setPayments([]); 

      try {
        const response = await fetch('/api/payments');
        // Add slight delay for demoing loading animation
        // await new Promise(res => setTimeout(res, 1500)); 
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `API request failed with status ${response.status}`);
        }
        setPayments(data.payments || []); 
        console.log(`Successfully fetched ${data.payments?.length || 0} payments via API.`);

      } catch (err: any) {
        console.error("Client-side error fetching from /api/payments:", err);
        setError(err.message || "Failed to load payment history.");
      } finally {
        // Keep loading true briefly after fetch to allow animation
        setTimeout(() => setIsLoading(false), 200); 
      }
    };

    fetchPayments();
  }, []); // Run only once on component mount

  return (
      // Added overflow-x-hidden to prevent potential horizontal scroll issues
      <div className="container mx-auto p-4 md:p-6 max-w-3xl overflow-x-hidden"> 
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6"> 
            <h1 className="text-2xl md:text-3xl font-bold">TipJar Payment History</h1>
            <Link href="/" passHref>
               {/* Added responsive padding to button */}
               <Button variant="outline" size="sm" className="px-3 py-1 md:px-4 md:py-2 text-sm md:text-base"> 
                 &larr; Back to Tipping
               </Button> 
            </Link>
        </div>
        <p className="text-xs text-gray-500 mb-6"> {/* Increased bottom margin */} 
           Source Contract: <code className="bg-gray-100 p-1 rounded text-xs break-all">{TIP_JAR_CONTRACT_ADDRESS}</code>
        </p>
        
        {/* Conditional Rendering for Loading, Error, Data */}
        <div className="transition-opacity duration-500 ease-in-out" >
            {isLoading ? (
                 <PaymentListSkeleton />
            ) : error ? (
                <p className="text-red-600 p-4 border border-red-300 bg-red-50 rounded break-words shadow-sm">Error: {error}</p>
            ) : (
              <div className="animate-fade-in"> {/* Added fade-in animation class */} 
                {payments.length === 0 ? (
                  <p className="text-center text-gray-600 py-6">No TipJar payment history found for this contract on Base Sepolia.</p>
                ) : (
                  <ul className="space-y-4"> 
                    {payments.map((payment) => (
                      // Added group for potential future hover effects
                      <li key={payment.id} className="group p-4 border rounded-lg shadow-sm bg-white overflow-hidden transition-shadow duration-200 hover:shadow-md"> 
                         <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1 mb-2"> 
                             <span className="font-semibold text-lg md:text-xl">{payment.amount}</span>
                             <span className="text-sm text-gray-500 flex-shrink-0 pt-1">
                                {new Date(payment.timestamp).toLocaleString()}
                            </span>
                         </div>
                         {/* Adjusted text size for responsiveness */}
                        <p className="text-sm md:text-base"><strong>From:</strong> <code className="text-xs bg-gray-100 p-1 rounded break-all">{payment.tipper}</code></p>
                        <p className="text-sm md:text-base"><strong>To Staff:</strong> {payment.staffName || <span className="text-gray-400 italic">N/A</span>}</p>
                        {payment.message && <p className="text-sm md:text-base mt-1 italic"><strong>Message:</strong> "{payment.message}"</p>}
                        <p className="mt-3 text-sm md:text-base"> {/* Increased top margin */} 
                          <strong>Tx:</strong>
                          <a
                             href={`${getEtherscanBaseUrl(84532n)}/tx/${payment.transactionHash}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-blue-600 hover:underline text-xs ml-1 break-all"
                           >
                            <code className="text-xs bg-gray-100 p-1 rounded">{payment.transactionHash}</code>
                          </a>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
        </div>
      </div>
    );
}

// NOTE: You might need to add the 'animate-fade-in' keyframes to your global CSS file (e.g., src/app/globals.css)
/* Example for globals.css: */
/* @layer utilities {
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
} */
