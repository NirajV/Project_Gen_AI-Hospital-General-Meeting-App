// Shared helpers + palette for the Patient Detail page subcomponents.
import { parseISO, differenceInYears } from 'date-fns';

export const PATIENT_CARD_COLORS = [
    { light: '#e8f5f0', dark: '#3b6658' }, // teal
    { light: '#f5f0e8', dark: '#694e20' }, // amber
    { light: '#f3edf5', dark: '#68517d' }, // purple
    { light: '#e8e8f5', dark: '#0b0b30' }, // dark blue
];

export const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    return differenceInYears(new Date(), parseISO(dob));
};

export const FILE_TYPE_ICONS = {
    radiology: '🩻',
    lab: '🧪',
    consult_note: '📋',
    specialist_note: '📝',
    other: '📄',
};

export const getFileIcon = (type) => FILE_TYPE_ICONS[type] || '📄';
