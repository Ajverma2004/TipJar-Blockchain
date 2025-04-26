
'use client';

import { useState } from 'react';
import Link from 'next/link'; // Import Link from next/link
import StaffList from '@/components/StaffList';
import TipForm from '@/components/TipForm';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const staffMembers = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];

export default function Home() {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  // The TipForm now handles its own confirmation/status display
  // const [submissionConfirmation, setSubmissionConfirmation] = useState<string | null>(null); 
  const { toast } = useToast();

  const handleStaffSelect = (staffName: string) => {
    setSelectedStaff(staffName);
    // setSubmissionConfirmation(null); // Clear previous confirmation
  };

  // This onSubmit might not be needed anymore if TipForm handles everything via contract
  // Or, you could use it for non-blockchain actions after a successful contract transaction
  // For now, we remove the confirmation logic here as TipForm shows status
  const handleTipFormSubmit = (name: string, phone: string, amount: number) => {
      console.log("TipForm onSubmit callback triggered (from page.tsx)", { name, phone, amount });
      // Example: maybe log this to an internal analytics service after success
      // toast({ title: "Callback Received", description: "Tip submitted successfully via contract." });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md space-y-4">
        <CardHeader>
          <CardTitle className="text-2xl text-center">TipJar DApp</CardTitle> {/* Updated Title */}
        </CardHeader>
        <CardContent className="flex flex-col space-y-6"> {/* Increased spacing */}
          
          {/* Button to navigate to Payment History page */}
          <div className="text-center">
            <Link href="/payments" passHref>
              <Button variant="outline">View Payment History</Button>
            </Link>
          </div>

          <StaffList staff={staffMembers} onSelect={handleStaffSelect} selectedStaff={selectedStaff} />
          
          {selectedStaff && (
            // Pass the handleTipFormSubmit only if needed for *additional* actions 
            // after TipForm confirms blockchain success. Otherwise, remove onSubmit prop.
            <TipForm selectedStaff={selectedStaff} /* onSubmit={handleTipFormSubmit} */ />
          )}
          
          {/* Remove local confirmation message, TipForm handles its own status */}
          {/* {submissionConfirmation && (...)} */}

          {!selectedStaff && (
            <div className="text-center text-gray-500 pt-4"> {/* Added padding */}
              Please select a staff member to tip.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
