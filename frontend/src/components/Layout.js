import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
    Activity, LayoutDashboard, Calendar, Users, User, Settings, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/meetings', label: 'Meetings', icon: Calendar },
    { path: '/patients', label: 'Patients', icon: Users },
];

export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DR';
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto px-4 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo">
                            <Activity className="w-7 h-7 text-primary" />
                            <span className="text-xl font-display font-bold text-primary">MedMeet</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path || 
                                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                                return (
                                    <Link key={item.path} to={item.path}>
                                        <Button
                                            variant={isActive ? 'secondary' : 'ghost'}
                                            className={`gap-2 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                                            data-testid={`nav-${item.label.toLowerCase()}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {item.label}
                                        </Button>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="user-menu-trigger">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user?.picture} alt={user?.name} />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                                {getInitials(user?.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end">
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium">{user?.name}</p>
                                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link to="/profile" className="cursor-pointer" data-testid="profile-link">
                                            <User className="mr-2 h-4 w-4" />
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/settings" className="cursor-pointer" data-testid="settings-link">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive" data-testid="logout-btn">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Mobile Menu Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                data-testid="mobile-menu-btn"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 bg-white p-4">
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                                        <Button
                                            variant={isActive ? 'secondary' : 'ghost'}
                                            className={`w-full justify-start gap-2 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {item.label}
                                        </Button>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
