import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Mail, Lock, User, Building, Stethoscope } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        specialty: '',
        organization: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                await register(formData);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const handleGoogleLogin = () => {
        const redirectUrl = window.location.origin + '/dashboard';
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" data-testid="login-page">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <Activity className="w-8 h-8 text-primary" />
                        <span className="text-2xl font-display font-bold text-primary">MedMeet</span>
                    </div>
                    <p className="text-muted-foreground">Hospital Case Meeting Scheduler</p>
                </div>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-display">
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </CardTitle>
                        <CardDescription>
                            {isLogin ? 'Sign in to your account' : 'Register as a healthcare professional'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isLogin && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder="Dr. John Smith"
                                                className="pl-10 h-11 bg-slate-50"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                data-testid="register-name-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="specialty">Specialty</Label>
                                        <div className="relative">
                                            <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="specialty"
                                                name="specialty"
                                                placeholder="Oncology"
                                                className="pl-10 h-11 bg-slate-50"
                                                value={formData.specialty}
                                                onChange={handleChange}
                                                data-testid="register-specialty-input"
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
                                                placeholder="City Hospital"
                                                className="pl-10 h-11 bg-slate-50"
                                                value={formData.organization}
                                                onChange={handleChange}
                                                data-testid="register-org-input"
                                            />
                                        </div>
                                    </div>
                                </>  
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="doctor@hospital.com"
                                        className="pl-10 h-11 bg-slate-50"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        data-testid="email-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 h-11 bg-slate-50"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        data-testid="password-input"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded" data-testid="auth-error">{error}</p>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors"
                                disabled={loading}
                                data-testid="submit-btn"
                            >
                                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                            </Button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-11 border-slate-200 hover:bg-slate-50 transition-colors"
                            onClick={handleGoogleLogin}
                            data-testid="google-login-btn"
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </Button>

                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                type="button"
                                className="text-primary hover:underline font-medium"
                                onClick={() => setIsLogin(!isLogin)}
                                data-testid="toggle-auth-mode"
                            >
                                {isLogin ? 'Register' : 'Sign In'}
                            </button>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
