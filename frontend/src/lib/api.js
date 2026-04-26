import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses — but only for true session expiry. Domain-level
// 401s (e.g. "current password is incorrect" from /auth/change-password)
// must surface to the caller instead of forcing a logout.
const SESSION_401_WHITELIST = ['/auth/change-password', '/auth/login'];

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';
        const isWhitelisted = SESSION_401_WHITELIST.some((path) => url.includes(path));
        if (error.response?.status === 401 && !isWhitelisted) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Users
export const getUsers = () => api.get('/users').then(res => ({ data: res.data }));
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const changePassword = ({ current_password, new_password }) =>
    api.post('/auth/change-password', { current_password, new_password });
export const submitFeedback = (data) => api.post('/feedback', data);

// Patients
export const getPatients = (params) => api.get('/patients', { params });
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (data) => api.post('/patients', data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);

// Meetings
export const getMeetings = (params) => api.get('/meetings', { params });
export const getMeeting = (id) => api.get(`/meetings/${id}`);
export const createMeeting = (data) => api.post('/meetings', data);
export const updateMeeting = (id, data) => api.put(`/meetings/${id}`, data);
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`);

// Meeting Participants
export const addParticipant = (meetingId, data) => api.post(`/meetings/${meetingId}/participants`, data);
export const updateParticipantResponse = (meetingId, userId, responseStatus) => api.put(`/meetings/${meetingId}/participants/${userId}/response`, { response_status: responseStatus });
export const respondToInvite = (meetingId, data) => api.put(`/meetings/${meetingId}/respond`, data);
export const removeParticipant = (meetingId, userId) => api.delete(`/meetings/${meetingId}/participants/${userId}`);

// Meeting Patients
export const addPatientToMeeting = (meetingId, data) => api.post(`/meetings/${meetingId}/patients`, data);
export const removePatientFromMeeting = (meetingId, patientId) => api.delete(`/meetings/${meetingId}/patients/${patientId}`);
export const approvePatientAddition = (meetingId, patientId) => api.post(`/meetings/${meetingId}/patients/${patientId}/approve`);

export const generateStandaloneTeamsLink = ({ title, meeting_date, start_time, end_time }) =>
    api.post('/teams/generate-link', { title, meeting_date, start_time, end_time });

// Agenda
export const addAgendaItem = (meetingId, data) => api.post(`/meetings/${meetingId}/agenda`, data);
export const updateAgendaItem = (meetingId, itemId, data) => api.put(`/meetings/${meetingId}/agenda/${itemId}`, data);
export const updateTreatmentPlan = (meetingId, itemId, treatmentPlan) => api.put(`/meetings/${meetingId}/agenda/${itemId}/treatment-plan`, { treatment_plan: treatmentPlan });
export const deleteAgendaItem = (meetingId, itemId) => api.delete(`/meetings/${meetingId}/agenda/${itemId}`);

// Decisions
export const createDecision = (meetingId, data) => api.post(`/meetings/${meetingId}/decisions`, data);
export const updateDecision = (meetingId, decisionId, data) => api.put(`/meetings/${meetingId}/decisions/${decisionId}`, data);
export const deleteDecision = (meetingId, decisionId) => api.delete(`/meetings/${meetingId}/decisions/${decisionId}`);

// Files
export const uploadFile = (meetingId, formData) => api.post(`/meetings/${meetingId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteFile = (fileId) => api.delete(`/files/${fileId}`);
export const getFileUrl = (fileId) => `${API_URL}/api/files/${fileId}`;

export default api;
