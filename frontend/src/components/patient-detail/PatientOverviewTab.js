import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import {
    Phone, Mail, MapPin, Calendar, Building, User, FileText, Heart, AlertTriangle, Pill,
} from 'lucide-react';

const TealCard = ({ patient }) => (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#e8f5f0' }}>
        <CardHeader>
            <CardTitle className="text-lg" style={{ color: '#3b6658' }}>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {patient.phone && (
                <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4" style={{ color: '#3b6658' }} />
                    <span style={{ color: '#3b6658' }}>{patient.phone}</span>
                </div>
            )}
            {patient.email && (
                <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" style={{ color: '#3b6658' }} />
                    <span style={{ color: '#3b6658' }}>{patient.email}</span>
                </div>
            )}
            {patient.address && (
                <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-1" style={{ color: '#3b6658' }} />
                    <span style={{ color: '#3b6658' }}>{patient.address}</span>
                </div>
            )}
            {patient.date_of_birth && (
                <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4" style={{ color: '#3b6658' }} />
                    <span style={{ color: '#3b6658' }}>
                        {format(parseISO(patient.date_of_birth), 'MMMM d, yyyy')}
                    </span>
                </div>
            )}
            {!patient.phone && !patient.email && !patient.address && (
                <p className="text-sm" style={{ color: '#3b6658', opacity: 0.7 }}>No contact information</p>
            )}
        </CardContent>
    </Card>
);

const DepartmentCard = ({ patient }) => (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f5f0e8' }}>
        <CardHeader>
            <CardTitle className="text-lg" style={{ color: '#694e20' }}>Department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {patient.department_name && (
                <div className="flex items-center gap-3">
                    <Building className="w-4 h-4" style={{ color: '#694e20' }} />
                    <span style={{ color: '#694e20' }}>{patient.department_name}</span>
                </div>
            )}
            {patient.department_provider_name && (
                <div className="flex items-center gap-3">
                    <User className="w-4 h-4" style={{ color: '#694e20' }} />
                    <span style={{ color: '#694e20' }}>{patient.department_provider_name}</span>
                </div>
            )}
            {!patient.department_name && !patient.department_provider_name && (
                <p className="text-sm" style={{ color: '#694e20', opacity: 0.7 }}>No department assigned</p>
            )}
        </CardContent>
    </Card>
);

const QuickStatsCard = ({ patient }) => (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f3edf5' }}>
        <CardHeader>
            <CardTitle className="text-lg" style={{ color: '#68517d' }}>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#68517d20' }}>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: '#68517d' }} />
                    <span className="text-sm font-semibold" style={{ color: '#68517d' }}>Meetings</span>
                </div>
                <span className="text-lg font-bold" style={{ color: '#68517d' }}>{patient.meetings?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#68517d20' }}>
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: '#68517d' }} />
                    <span className="text-sm font-semibold" style={{ color: '#68517d' }}>Documents</span>
                </div>
                <span className="text-lg font-bold" style={{ color: '#68517d' }}>{patient.files?.length || 0}</span>
            </div>
        </CardContent>
    </Card>
);

const MedicalCard = ({ patient }) => (
    <Card
        className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 lg:col-span-3"
        style={{ backgroundColor: '#e8e8f5' }}
    >
        <CardHeader>
            <CardTitle className="text-lg" style={{ color: '#0b0b30' }}>Medical Information</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Primary Diagnosis</Label>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#0b0b30' }}>
                        {patient.primary_diagnosis || 'Not specified'}
                    </p>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Allergies</Label>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#0b0b30' }}>
                        {patient.allergies || 'None recorded'}
                    </p>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-4 h-4 text-blue-500" />
                        <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Current Medications</Label>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#0b0b30' }}>
                        {patient.current_medications || 'None recorded'}
                    </p>
                </div>
            </div>
            {patient.notes && (
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid #0b0b3030' }}>
                    <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Additional Notes</Label>
                    <p className="text-sm mt-2" style={{ color: '#0b0b30' }}>{patient.notes}</p>
                </div>
            )}
        </CardContent>
    </Card>
);

export const PatientOverviewTab = ({ patient }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TealCard patient={patient} />
        <DepartmentCard patient={patient} />
        <QuickStatsCard patient={patient} />
        <MedicalCard patient={patient} />
    </div>
);
