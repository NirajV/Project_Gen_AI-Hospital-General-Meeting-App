// Shared rotating color palette used across meeting detail tab cards
// (participants, patients, files, decisions, agenda). Centralized so a
// palette change updates every tab consistently.

export const MEETING_CARD_COLORS = [
    { light: '#e8f5f0', dark: '#3b6658' }, // Teal
    { light: '#f5f0e8', dark: '#694e20' }, // Amber
    { light: '#f3edf5', dark: '#68517d' }, // Purple
    { light: '#e8e8f5', dark: '#0b0b30' }, // Blue
];

export const colorAt = (idx) =>
    MEETING_CARD_COLORS[idx % MEETING_CARD_COLORS.length];
