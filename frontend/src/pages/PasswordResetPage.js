import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Mail } from 'lucide-react';

const PasswordResetPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setEmail('');
                // Redirect to login after 5 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 5000);
            } else {
                setError(data.detail || 'Failed to reset password');
            }
        } catch (err) {
            console.error('Password reset error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-xl">
                    <CardHeader className="space-y-1">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                            <Link to="/login">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Back
                                </Button>
                            </Link>
                        </div>
                        <CardDescription>
                            Enter your email address and we'll send you a new password
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    <strong>Success!</strong> If an account with that email exists, a new password has been sent to your email address.
                                    <br /><br />
                                    Please check your inbox and use the new password to login.
                                    <br /><br />
                                    Redirecting to login page in 5 seconds...
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="your.email@hospital.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                            disabled={loading}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-sm text-center text-muted-foreground">
                            Remember your password?{' '}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Sign in here
                            </Link>
                        </div>
                        <div className="text-xs text-center text-muted-foreground">
                            🔒 For security reasons, we don't disclose whether an email exists in our system
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default PasswordResetPage;
