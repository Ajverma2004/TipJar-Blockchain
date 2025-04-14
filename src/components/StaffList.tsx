
import React from 'react';
import {Button} from "@/components/ui/button";

interface StaffListProps {
  staff: string[];
  onSelect: (staffName: string) => void;
  selectedStaff: string | null;
}

const StaffList: React.FC<StaffListProps> = ({staff, onSelect, selectedStaff}) => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Staff</h2>
      <div className="flex flex-wrap gap-2">
        {staff.map((staffName) => (
          <Button
            key={staffName}
            variant={selectedStaff === staffName ? "secondary" : "outline"}
            onClick={() => onSelect(staffName)}
          >
            {staffName}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default StaffList;
