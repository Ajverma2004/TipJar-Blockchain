import React from 'react';
import { Button } from "@/components/ui/button";

interface StaffListProps {
  
  staffNames: string[]; 
  onSelectStaff: (staffName: string) => void; // Match prop name in PaymentsPage
  selectedStaff: string | null;
}

const StaffList: React.FC<StaffListProps> = ({ staffNames, onSelectStaff, selectedStaff }) => {
  // Defensive check: Ensure staffNames is an array before mapping
  const staffToDisplay = Array.isArray(staffNames) ? staffNames : [];

  // Add a console log to see what props are received
  console.log('[Debug] StaffList received props:', { staffNames, selectedStaff });

  return (
    <div>
      {/* Removed redundant Staff heading, already present in PaymentsPage */}
      {/* <h2 className="text-lg font-semibold mb-2">Staff</h2> */}
      <div className="flex flex-col space-y-2"> {/* Changed to flex-col for better button layout */}
        {staffToDisplay.length > 0 ? (
          staffToDisplay.map((staffName) => (
            <Button
              key={staffName}
              variant={selectedStaff === staffName ? "secondary" : "outline"}
              onClick={() => onSelectStaff(staffName)} 
              className="w-full justify-start" // Full width and left-aligned text
            >
              {staffName}
            </Button>
          ))
        ) : (
          <p className="text-sm text-gray-500">No staff members available.</p> // Message if list is empty
        )}
      </div>
    </div>
  );
};

export default StaffList;
