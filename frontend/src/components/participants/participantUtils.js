// Shared helpers + color palette for the Participants page subcomponents.

export const PARTICIPANT_CARD_COLORS = [
    { light: '#e8f5f0', dark: '#3b6658', hover: '#2d5047' }, // teal (meetings)
    { light: '#f5f0e8', dark: '#694e20', hover: '#523c19' }, // amber (patients)
    { light: '#f3edf5', dark: '#68517d', hover: '#523d61' }, // purple (participants)
    { light: '#e8e8f5', dark: '#0b0b30', hover: '#070725' }, // dark blue (dashboard)
];

export const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'DR';

export const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
        case 'admin':
        case 'organizer':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'doctor':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'nurse':
            return 'bg-green-100 text-green-800 border-green-200';
        default:
            return 'bg-slate-100 text-slate-800 border-slate-200';
    }
};
