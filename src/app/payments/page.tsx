'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TipForm from '@/components/TipForm';
import StaffList from '@/components/StaffList';
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import staffJsonData from '@/staffs.json'; 


interface StaffMember {
  name: string;
  address: string;
}

const PaymentsPage: React.FC = () => {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true); 
    setError(null);    
    try {
      console.log("[PaymentsPage] useEffect: Processing staff data...");
      if (!Array.isArray(staffJsonData)) {
        throw new Error("Staff data (staffs.json) is not a valid array.");
      }

      const validStaffData = staffJsonData as StaffMember[];
      const names = validStaffData
                      .filter(staff => staff && typeof staff.name === 'string')
                      .map(staff => staff.name);
                      
      if (names.length !== validStaffData.length) {
           console.warn("[PaymentsPage] Some entries in staffs.json might be missing a 'name' property.");
      }
      
      setStaffNames(names);
      console.log("[PaymentsPage] Staff names loaded successfully:", names);

    } catch (e: any) {
      console.error("[PaymentsPage] Error processing staff data:", e);
      setError(e.message || "An unexpected error occurred while loading staff data.");
      setStaffNames([]); 
    } finally {
      setIsLoading(false);
      console.log("[PaymentsPage] useEffect: Finished processing staff data.");
    }
  }, []); 

  const handleSelectStaff = (staffName: string) => {
    setSelectedStaff(staffName);
    console.log(`Selected staff: ${staffName}`);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading staff list...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-600">Error loading staff: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h1 className="text-2xl font-bold">Send a Tip</h1>
          <div className="flex gap-2">
              <Link href="/" passHref>
                 <Button variant="outline">Back to Home</Button>
              </Link>
              <Link href="/history" passHref>
                  <Button variant="outline">View History</Button>
              </Link>
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-1/4">
            <h2 className="text-xl font-semibold mb-4">Select Staff</h2>
            <StaffList 
              staffNames={staffNames} 
              onSelectStaff={handleSelectStaff} 
              selectedStaff={selectedStaff}
            />
          </aside>

          <main className="w-full md:w-3/4">
            {selectedStaff ? (
              <TipForm 
                key={selectedStaff}
                selectedStaff={selectedStaff}
              />
            ) : (
              <div className="flex items-center justify-center h-40 border rounded-lg bg-gray-50">
                {staffNames.length > 0 ? (
                     <p className="text-gray-500">Please select a staff member to tip.</p>
                ) : (
                     <p className="text-red-500">No staff members found. Check staffs.json or console for errors.</p>
                )}
              </div>
            )}
          </main>
      </div>
      <Toaster />
    </div>
  );
};

export default PaymentsPage;
