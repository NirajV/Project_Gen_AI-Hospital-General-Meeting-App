import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Edit } from 'lucide-react';
import { calculateAge } from './patientDetailUtils';

export const PatientHeader = ({ patient, onEdit }) => (
    <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
                    {patient.first_name} {patient.last_name}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                    {patient.patient_id_number && <span>MRN: {patient.patient_id_number}</span>}
                    <span>{calculateAge(patient.date_of_birth)} years old</span>
                    {patient.gender && (
                        <Badge variant="outline" className="capitalize">{patient.gender}</Badge>
                    )}
                </div>
            </div>
        </div>
        <Button variant="outline" onClick={onEdit} data-testid="edit-btn">
            <Edit className="w-4 h-4 mr-2" /> Edit Profile
        </Button>
    </div>
);
