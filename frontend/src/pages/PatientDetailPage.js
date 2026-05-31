import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, updatePatient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PatientHeader } from '@/components/patient-detail/PatientHeader';
import { PatientOverviewTab } from '@/components/patient-detail/PatientOverviewTab';
import { PatientMeetingsTab } from '@/components/patient-detail/PatientMeetingsTab';
import { PatientFilesTab } from '@/components/patient-detail/PatientFilesTab';
import { PatientTreatmentPlansTab } from '@/components/patient-detail/PatientTreatmentPlansTab';
import { PatientEditDialog } from '@/components/patient-detail/PatientEditDialog';

const TAB_STYLES = {
    overview:        { active: '#694e20', inactive: { bg: '#f5f0e8', fg: '#694e20' } },
    meetings:        { active: '#3b6658', inactive: { bg: '#e8f5f0', fg: '#3b6658' } },
    files:           { active: '#68517d', inactive: { bg: '#f3edf5', fg: '#68517d' } },
    treatment_plans: { active: '#0b0b30', inactive: { bg: '#e8e8f5', fg: '#0b0b30' } },
};

const tabStyle = (active, key) => {
    const def = TAB_STYLES[key];
    return active === key
        ? { backgroundColor: def.active, color: '#ffffff' }
        : { backgroundColor: def.inactive.bg, color: def.inactive.fg };
};

export default function PatientDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editDialog, setEditDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        loadPatient();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadPatient = async () => {
        try {
            const res = await getPatient(id);
            setPatient(res.data);
            setEditForm(res.data);
        } catch (error) {
            console.error('Failed to load patient:', error);
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async () => {
        setSaving(true);
        try {
            await updatePatient(id, editForm);
            loadPatient();
            setEditDialog(false);
        } catch (error) {
            console.error('Failed to update patient:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    if (!patient) return null;

    return (
        <Layout>
            <div className="space-y-6" data-testid="patient-detail">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/patients')}
                    className="mb-2"
                    data-testid="back-btn"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Patients
                </Button>

                <PatientHeader patient={patient} onEdit={() => setEditDialog(true)} />

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-transparent border-0 p-0 gap-2">
                        <TabsTrigger
                            value="overview"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={tabStyle(activeTab, 'overview')}
                        >
                            Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="meetings"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={tabStyle(activeTab, 'meetings')}
                        >
                            Meetings ({patient.meetings?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="files"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={tabStyle(activeTab, 'files')}
                        >
                            Files ({patient.files?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="treatment_plans"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={tabStyle(activeTab, 'treatment_plans')}
                        >
                            Treatment Plans ({patient.treatment_plans?.length || 0})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                        <PatientOverviewTab patient={patient} />
                    </TabsContent>

                    <TabsContent value="meetings" className="mt-6">
                        <PatientMeetingsTab meetings={patient.meetings} />
                    </TabsContent>

                    <TabsContent value="files" className="mt-6">
                        <PatientFilesTab files={patient.files} />
                    </TabsContent>

                    <TabsContent value="treatment_plans" className="mt-6">
                        <PatientTreatmentPlansTab plans={patient.treatment_plans} />
                    </TabsContent>
                </Tabs>
            </div>

            <PatientEditDialog
                open={editDialog}
                onOpenChange={setEditDialog}
                form={editForm}
                onFormChange={setEditForm}
                onSave={handleEdit}
                saving={saving}
            />
        </Layout>
    );
}
