import React from 'react';
import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PatientNameInputProps {
  patientName: string;
  onPatientNameChange: (name: string) => void;
  onClearAll: () => void;
}

export function PatientNameInput({ 
  patientName, 
  onPatientNameChange, 
  onClearAll 
}: PatientNameInputProps) {
  return (
    <div className="sidebar-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <User className="mr-2 h-5 w-5 text-medical" />
          Patient Name
        </h3>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onPatientNameChange('')}>
              Clear Patient Name
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onClearAll}
              className="text-destructive focus:text-destructive"
            >
              Clear All Videos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <input
        type="text"
        placeholder="Enter patient name..."
        value={patientName}
        onChange={(e) => onPatientNameChange(e.target.value)}
        className="patient-input"
      />
    </div>
  );
}