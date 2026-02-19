import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPatients, deletePatient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Layout from '@/components/Layout';
import { 
    Users, Plus, Search, ArrowRight, User, Calendar, Building,
    FileText, Loader2, Trash2, AlertCircle
} from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';

export default function PatientsPage() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteDialog, setDeleteDialog] = useState({ open: false, patient: null });

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async (search = '') => {
        setLoading(true);
        try {
            const res = await getPatients({ search });
            setPatients(res.data);
        } catch (error) {
            console.error('Failed to load patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        // Debounce search
        const timer = setTimeout(() => loadPatients(value), 300);
        return () => clearTimeout(timer);
    };

    const handleDelete = async () => {
        try {
            await deletePatient(deleteDialog.patient.id);
            loadPatients(searchTerm);
            setDeleteDialog({ open: false, patient: null });
        } catch (error) {
            console.error('Failed to delete patient:', error);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        return differenceInYears(new Date(), parseISO(dob));
    };

    return (
        <Layout>
            <div className="space-y-6" data-testid="patients-page">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Patients</h1>
                        <p className="text-muted-foreground mt-1">Manage patient records and case history</p>
                    </div>
                    <Link to="/patients/new">
                        <Button className="bg-primary hover:bg-primary/90" data-testid="new-patient-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Patient
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search patients by name or ID..."
                        className="pl-10 h-11 bg-white"
                        value={searchTerm}
                        onChange={handleSearch}
                        data-testid="patient-search"
                    />
                </div>

                {/* Patient List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : patients.length === 0 ? (
                    <Card className="border-slate-200">
                        <CardContent className="py-12 text-center">
                            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">
                                {searchTerm ? 'No patients found matching your search' : 'No patients registered yet'}
                            </p>
                            <Link to="/patients/new">
                                <Button variant="outline" className="mt-4">Add your first patient</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {patients.map((patient, idx) => (
                            <Card key={patient.id} className="border-slate-200 hover:border-primary/30 hover:shadow-sm transition-all" data-testid={`patient-card-${idx}`}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-foreground">
                                                    {patient.first_name} {patient.last_name}
                                                </h3>
                                                {patient.patient_id_number && (
                                                    <p className="text-xs text-muted-foreground">ID: {patient.patient_id_number}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeleteDialog({ open: true, patient })}
                                            data-testid={`delete-patient-${idx}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            <span>{calculateAge(patient.date_of_birth)} years</span>
                                            {patient.gender && (
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {patient.gender}
                                                </Badge>
                                            )}
                                        </div>
                                        {patient.department_name && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Building className="w-4 h-4" />
                                                <span>{patient.department_name}</span>
                                            </div>
                                        )}
                                        {patient.primary_diagnosis && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FileText className="w-4 h-4" />
                                                <span className="truncate">{patient.primary_diagnosis}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Link to={`/patients/${patient.id}`} className="block mt-4">
                                        <Button variant="outline" className="w-full" data-testid={`view-patient-${idx}`}>
                                            View Details
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, patient: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete patient "{deleteDialog.patient?.first_name} {deleteDialog.patient?.last_name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog({ open: false, patient: null })}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} data-testid="confirm-delete">
                            Delete Patient
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
