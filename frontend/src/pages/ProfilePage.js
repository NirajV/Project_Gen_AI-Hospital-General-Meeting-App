import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Layout from '@/components/Layout';
import ProfileInformationTab from '@/components/profile/ProfileInformationTab';
import ChangePasswordTab from '@/components/profile/ChangePasswordTab';
import SettingsTab from '@/components/profile/SettingsTab';
import FeedbackTab from '@/components/profile/FeedbackTab';

const getInitials = (name) =>
    (name || '').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'DR';

export default function ProfilePage() {
    const { user, checkAuth } = useAuth();
    const location = useLocation();
    // /settings opens the Settings tab directly; /profile opens Profile Information.
    const defaultTab = location.pathname.startsWith('/settings')
        ? 'settings'
        : 'profile';

    return (
        <Layout>
            <div className="max-w-4xl mx-auto" data-testid="profile-page">
                <div className="mb-6 flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                        <AvatarImage src={user?.picture} alt={user?.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {getInitials(user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-display font-bold tracking-tight">
                            My Profile
                        </h1>
                        <p className="text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </div>

                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="profile" data-testid="tab-profile">
                            Profile Information
                        </TabsTrigger>
                        <TabsTrigger value="password" data-testid="tab-password">
                            Change Password
                        </TabsTrigger>
                        <TabsTrigger value="settings" data-testid="tab-settings">
                            Settings
                        </TabsTrigger>
                        <TabsTrigger value="feedback" data-testid="tab-feedback">
                            Feedback
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-6">
                        <ProfileInformationTab user={user} onUpdated={checkAuth} />
                    </TabsContent>
                    <TabsContent value="password" className="mt-6">
                        <ChangePasswordTab />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-6">
                        <SettingsTab user={user} onUpdated={checkAuth} />
                    </TabsContent>
                    <TabsContent value="feedback" className="mt-6">
                        <FeedbackTab />
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}
