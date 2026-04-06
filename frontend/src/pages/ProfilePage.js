import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/Layout';
import { User, Mail, Building, Stethoscope, Phone, Save, Loader2, MessageSquare, Send } from 'lucide-react';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, checkAuth } = useAuth();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        specialty: user?.specialty || '',
        organization: user?.organization || '',
        phone: user?.phone || ''
    });

    // Feedback form state
    const [feedbackDialog, setFeedbackDialog] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [feedbackData, setFeedbackData] = useState({
        feedback_type: 'feature_request',
        subject: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFeedbackChange = (e) => {
        setFeedbackData({ ...feedbackData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateUser(user.id, formData);
            await checkAuth();
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        setSubmittingFeedback(true);
        
        try {
            const API_URL = process.env.REACT_APP_BACKEND_URL;
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch(`${API_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(feedbackData)
            });
            
            if (response.ok) {
                alert('✅ Feedback submitted successfully! Thank you for your input.');
                setFeedbackDialog(false);
                setFeedbackData({
                    feedback_type: 'feature_request',
                    subject: '',
                    message: ''
                });
            } else {
                throw new Error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            alert('❌ Failed to submit feedback. Please try again.');
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DR';
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto" data-testid="profile-page">
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Profile</h1>
                    <p className="text-muted-foreground mt-1">Manage your account settings</p>
                </div>

                <Card className="border-slate-200">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                                <AvatarImage src={user?.picture} alt={user?.name} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                                    {getInitials(user?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle>{user?.name}</CardTitle>
                                <CardDescription>{user?.email}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10 h-11 bg-slate-50"
                                        data-testid="name-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="pl-10 h-11 bg-slate-100"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="specialty">Specialty</Label>
                                <div className="relative">
                                    <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="specialty"
                                        name="specialty"
                                        value={formData.specialty}
                                        onChange={handleChange}
                                        placeholder="e.g., Oncology, Cardiology"
                                        className="pl-10 h-11 bg-slate-50"
                                        data-testid="specialty-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization">Organization</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="organization"
                                        name="organization"
                                        value={formData.organization}
                                        onChange={handleChange}
                                        placeholder="e.g., City Hospital"
                                        className="pl-10 h-11 bg-slate-50"
                                        data-testid="organization-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+1 234 567 8900"
                                        className="pl-10 h-11 bg-slate-50"
                                        data-testid="phone-input"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 bg-primary hover:bg-primary/90"
                                disabled={saving}
                                data-testid="save-btn"
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Change Password Card */}
                <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-primary">🔐</span> Change Password
                        </CardTitle>
                        <CardDescription>
                            Update your password to keep your account secure
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChangePasswordForm />
                    </CardContent>
                </Card>

                {/* Feedback Card */}
                <Card className="border-l-4 border-l-accent">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-accent" /> Send Feedback
                        </CardTitle>
                        <CardDescription>
                            Help us improve the app by sharing your ideas, reporting bugs, or suggesting enhancements
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => setFeedbackDialog(true)}
                            className="w-full h-11 bg-accent hover:bg-accent/90"
                            data-testid="feedback-btn"
                        >
                            <Send className="w-4 h-4 mr-2" /> Submit Feedback
                        </Button>
                    </CardContent>
                </Card>

                {/* Feedback Dialog */}
                <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-accent" /> Send Feedback
                            </DialogTitle>
                            <DialogDescription>
                                We value your feedback! Let us know about new features you'd like, bugs you've encountered, or improvements you'd suggest.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="feedback_type">Feedback Type</Label>
                                <Select 
                                    value={feedbackData.feedback_type} 
                                    onValueChange={(value) => setFeedbackData({...feedbackData, feedback_type: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="feature_request">🚀 Feature Request</SelectItem>
                                        <SelectItem value="bug_report">🐛 Bug Report</SelectItem>
                                        <SelectItem value="enhancement">✨ Enhancement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input
                                    id="subject"
                                    name="subject"
                                    value={feedbackData.subject}
                                    onChange={handleFeedbackChange}
                                    placeholder="Brief description of your feedback"
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    name="message"
                                    value={feedbackData.message}
                                    onChange={handleFeedbackChange}
                                    placeholder="Please provide detailed information..."
                                    required
                                    rows={6}
                                    className="resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFeedbackDialog(false)}
                                    className="flex-1"
                                    disabled={submittingFeedback}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-accent hover:bg-accent/90"
                                    disabled={submittingFeedback}
                                >
                                    {submittingFeedback ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Send Feedback</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}

// Change Password Component
function ChangePasswordForm() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
        setMessage({ type: '', text: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validation
        if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
            setMessage({ type: 'error', text: 'All fields are required' });
            return;
        }

        if (passwords.newPassword.length < 8) {
            setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    current_password: passwords.currentPassword,
                    new_password: passwords.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Failed to change password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message.text && (
                <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password *</Label>
                <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    disabled={loading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 8 characters)"
                    disabled={loading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    disabled={loading}
                />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing Password...</>
                ) : (
                    'Change Password'
                )}
            </Button>
        </form>
    );
}
