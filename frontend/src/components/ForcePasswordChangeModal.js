import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export default function ForcePasswordChangeModal({ open, onPasswordChanged }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (passwords.newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (passwords.newPassword === passwords.currentPassword) {
            setError('New password must be different from current password');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    current_password: passwords.currentPassword,
                    new_password: passwords.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Password changed successfully
                onPasswordChanged();
            } else {
                setError(data.detail || 'Failed to change password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md" hideCloseButton>
                <DialogHeader>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-orange-100">
                        <Lock className="w-6 h-6 text-orange-600" />
                    </div>
                    <DialogTitle className="text-center text-2xl">Change Your Password</DialogTitle>
                    <DialogDescription className="text-center">
                        For security reasons, you must change your temporary password before continuing.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current (Temporary) Password *</Label>
                        <Input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            value={passwords.currentPassword}
                            onChange={handleChange}
                            placeholder="Enter your temporary password"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password *</Label>
                        <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={passwords.newPassword}
                            onChange={handleChange}
                            placeholder="Min 8 characters"
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Choose a strong password with at least 8 characters
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                            placeholder="Re-enter new password"
                            disabled={loading}
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing Password...</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Change Password & Continue</>
                        )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        🔒 This is required for your account security
                    </p>
                </form>
            </DialogContent>
        </Dialog>
    );
}
