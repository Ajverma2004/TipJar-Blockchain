'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";


interface Payment {
  id: string; 
  tipper: string;
  staffName: string;
  message: string;
  amount: string;
  transactionHash: string;
  timestamp: number; 
}

const SEPOLIA_EXPLORER_BASE_URL = "https://sepolia.etherscan.io";

const HistoryPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log("[HistoryPage] Fetching payment history from /api/payments...");
    try {
      const response = await fetch('/api/payments'); // Call the API route
      
      // Log raw response status
      console.log(`[HistoryPage] API response status: ${response.status}`);

      // Try to get raw text for debugging even if response is not ok
      const rawResponseText = await response.text();
      console.log("[HistoryPage] Raw API response text:", rawResponseText);

      if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
              // Try to parse error JSON if possible
              const errorData = JSON.parse(rawResponseText); 
              errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
              // If parsing fails, use the raw text if it's not too long
              errorMessage = rawResponseText.substring(0, 100) || errorMessage;
          }
          console.error("[HistoryPage] API request failed:", errorMessage);
          throw new Error(errorMessage);
      }
      
      // Parse the successful response
      const data = JSON.parse(rawResponseText); 
      console.log("[HistoryPage] Parsed API data:", data);

      if (data && Array.isArray(data.payments)) {
          console.log(`[HistoryPage] Received ${data.payments.length} payments.`);
          setPayments(data.payments);
      } else {
          console.error("[HistoryPage] API response format incorrect. Expected { payments: [...] }", data);
          throw new Error("Received invalid data format from server.");
      }
    } catch (err: any) { // Catch any type of error
      console.error("[HistoryPage] Failed to fetch payment history:", err);
      setError(err.message || "An unexpected error occurred while fetching history.");
      setPayments([]); // Clear payments on error
    } finally {
      setIsLoading(false);
      console.log("[HistoryPage] Finished fetching attempt.");
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]); // Fetch on component mount

  const formatTimestamp = (timestamp: number) => {
      // API provides timestamp in milliseconds already
      if (!timestamp || typeof timestamp !== 'number') return "Invalid Date";
      try {
            return new Date(timestamp).toLocaleString(); // Format date/time nicely
      } catch { 
            return "Invalid Date";
      }
  };

  const truncateAddress = (address: string) => {
      if (!address || address.length < 10) return address || "N/A";
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Transaction History</CardTitle>
          <CardDescription>Recent tips sent through the TipJar contract on Sepolia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-between items-center">
            <Button onClick={fetchPayments} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh History"}
            </Button>
             <Link href="/" passHref>
                 <Button variant="outline">Back to Home</Button>
             </Link>
          </div>

          {error && (
             <Alert variant="destructive" className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error Fetching History</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}

          <div className="overflow-x-auto"> {/* Added for small screens */} 
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tipper</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Show skeleton loaders while loading
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatTimestamp(payment.timestamp)}</TableCell>
                      <TableCell>
                          <Badge variant="outline" title={payment.tipper}>{truncateAddress(payment.tipper)}</Badge>
                      </TableCell>
                      <TableCell>{payment.staffName || "N/A"}</TableCell>
                      <TableCell className="whitespace-nowrap">{payment.amount || "N/A"}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={payment.message}>{payment.message || "-"}</TableCell>
                      <TableCell>
                        <a 
                          href={`${SEPOLIA_EXPLORER_BASE_URL}/tx/${payment.transactionHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          title={payment.transactionHash}
                        >
                          {truncateAddress(payment.transactionHash)}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // Show message if no payments found (and not loading/error)
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-4">
                      No payment history found or API returned empty.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
  
    </div>
  );
};

export default HistoryPage;
