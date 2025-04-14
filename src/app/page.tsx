
'use client';

import {useState} from 'react';
import StaffList from '@/components/StaffList';
import TipForm from '@/components/TipForm';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {useToast} from "@/hooks/use-toast";

const staffMembers = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];

export default function Home() {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [submissionConfirmation, setSubmissionConfirmation] = useState<string | null>(null);
  const {toast} = useToast();

  const handleStaffSelect = (staffName: string) => {
    setSelectedStaff(staffName);
    setSubmissionConfirmation(null); // Clear previous confirmation
  };

  const handleSubmit = (name: string, phone: string, amount: number) => {
    if (selectedStaff) {
      setSubmissionConfirmation(`Tip of £${amount} submitted for ${selectedStaff} by ${name} (Phone: ${phone})`);
      toast({
        title: "Tip Submitted",
        description: `Tip of £${amount} submitted for ${selectedStaff} by ${name} (Phone: ${phone})`
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md space-y-4">
        <CardHeader>
          <CardTitle className="text-2xl text-center">TipJar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <StaffList staff={staffMembers} onSelect={handleStaffSelect} selectedStaff={selectedStaff}/>
          {selectedStaff && (
            <TipForm onSubmit={handleSubmit} selectedStaff={selectedStaff}/>
          )}
          {submissionConfirmation && (
            <div className="p-4 rounded-md bg-green-100 text-green-700">
              {submissionConfirmation}
            </div>
          )}
          {!selectedStaff && (
            <div className="text-center text-gray-500">
              Please select a staff member to tip.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
