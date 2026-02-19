import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/Layout';
import { ArrowLeft, User, Loader2, Save } from 'lucide-react';

export default function PatientFormPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        patient_id_number: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        primary_diagnosis: '',
        allergies: '',
        current_medications: '',
        department_name: '',
        department_provider_name: '',
        notes: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.date_of_birth) delete payload.date_of_birth;
            const res = await createPatient(payload);
            navigate(`/patients/${res.data.id}`);
        } catch (error) {
            console.error('Failed to create patient:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-3xl mx-auto" data-testid="patient-form-page">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/patients')}
                    className="mb-6"
                    data-testid="back-btn"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Patients
                </Button>

                <Card className="border-slate-200">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-display">Add New Patient</CardTitle>
                                <CardDescription>Enter patient information and medical history</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium font-display border-b pb-2">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name *</Label>
                                        <Input
                                            id="first_name"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            required
                                            className="h-11 bg-slate-50"
                                            data-testid="first-name-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name *</Label>
                                        <Input
                                            id="last_name"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            required
                                            className="h-11 bg-slate-50"
                                            data-testid="last-name-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="patient_id_number">Patient ID</Label>
                                        <Input
                                            id="patient_id_number"
                                            name="patient_id_number"
                                            value={formData.patient_id_number}
                                            onChange={handleChange}
                                            placeholder="e.g., P-12345"
                                            className="h-11 bg-slate-50"
                                            data-testid="patient-id-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <Select onValueChange={(v) => handleSelectChange('gender', v)} value={formData.gender}>
                                            <SelectTrigger className="h-11 bg-slate-50" data-testid="gender-select">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                                        <Input
                                            id="date_of_birth"
                                            name="date_of_birth"
                                            type="date"
                                            value={formData.date_of_birth}
                                            onChange={handleChange}
                                            className="h-11 bg-slate-50"
                                            data-testid="dob-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+1 234 567 8900"
                                            className="h-11 bg-slate-50"
                                            data-testid="phone-input"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="patient@email.com"
                                        className="h-11 bg-slate-50"
                                        data-testid="email-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Full address"
                                        className="bg-slate-50"
                                        data-testid="address-input"
                                    />
                                </div>
                            </div>

                            {/* Medical Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium font-display border-b pb-2">Medical Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="department_name">Department</Label>
                                        <Input
                                            id="department_name"
                                            name="department_name"
                                            value={formData.department_name}
                                            onChange={handleChange}
                                            placeholder="e.g., Oncology"
                                            className="h-11 bg-slate-50"
                                            data-testid="department-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="department_provider_name">Provider Name</Label>
                                        <Input
                                            id="department_provider_name"
                                            name="department_provider_name"
                                            value={formData.department_provider_name}
                                            onChange={handleChange}
                                            placeholder="e.g., Dr. Smith"
                                            className="h-11 bg-slate-50"
                                            data-testid="provider-input"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="primary_diagnosis">Primary Diagnosis</Label>
                                    <Textarea
                                        id="primary_diagnosis"
                                        name="primary_diagnosis"
                                        value={formData.primary_diagnosis}
                                        onChange={handleChange}
                                        placeholder="Enter primary diagnosis"
                                        className="bg-slate-50"
                                        data-testid="diagnosis-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="allergies">Allergies</Label>
                                    <Textarea
                                        id="allergies"
                                        name="allergies"
                                        value={formData.allergies}
                                        onChange={handleChange}
                                        placeholder="List any known allergies"
                                        className="bg-slate-50"
                                        data-testid="allergies-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="current_medications">Current Medications</Label>
                                    <Textarea
                                        id="current_medications"
                                        name="current_medications"
                                        value={formData.current_medications}
                                        onChange={handleChange}
                                        placeholder="List current medications"
                                        className="bg-slate-50"
                                        data-testid="medications-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Additional Notes</Label>
                                    <Textarea
                                        id="notes"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Any additional notes"
                                        className="bg-slate-50"
                                        data-testid="notes-input"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/patients')}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-primary hover:bg-primary/90"
                                    disabled={loading}
                                    data-testid="submit-btn"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" /> Save Patient</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
