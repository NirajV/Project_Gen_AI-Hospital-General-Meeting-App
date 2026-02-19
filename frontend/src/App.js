import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import DashboardPage from "@/pages/DashboardPage";
import MeetingsPage from "@/pages/MeetingsPage";
import MeetingWizardPage from "@/pages/MeetingWizardPage";
import MeetingDetailPage from "@/pages/MeetingDetailPage";
import PatientsPage from "@/pages/PatientsPage";
import PatientFormPage from "@/pages/PatientFormPage";
import PatientDetailPage from "@/pages/PatientDetailPage";
import ProfilePage from "@/pages/ProfilePage";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AppRouter() {
    const location = useLocation();
    
    // Check URL fragment for session_id (OAuth callback) - SYNCHRONOUS check
    if (location.hash?.includes('session_id=')) {
        return <AuthCallback />;
    }

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/meetings" element={
                <ProtectedRoute><MeetingsPage /></ProtectedRoute>
            } />
            <Route path="/meetings/new" element={
                <ProtectedRoute><MeetingWizardPage /></ProtectedRoute>
            } />
            <Route path="/meetings/:id" element={
                <ProtectedRoute><MeetingDetailPage /></ProtectedRoute>
            } />
            <Route path="/patients" element={
                <ProtectedRoute><PatientsPage /></ProtectedRoute>
            } />
            <Route path="/patients/new" element={
                <ProtectedRoute><PatientFormPage /></ProtectedRoute>
            } />
            <Route path="/patients/:id" element={
                <ProtectedRoute><PatientDetailPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
                <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/settings" element={
                <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
        </Routes>
    );
}

function App() {
    return (
        <div className="App">
            <AuthProvider>
                <BrowserRouter>
                    <AppRouter />
                </BrowserRouter>
            </AuthProvider>
        </div>
    );
}

export default App;
