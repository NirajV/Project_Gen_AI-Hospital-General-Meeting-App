// In-app help content. Edit this file to update tips without touching React.
// Each tip belongs to a category and has a title, summary, ordered steps,
// and optional related-tip ids.

export const TIPS = [
    // ─── Getting Started ──────────────────────────────────────────
    {
        id: 'create-meeting',
        category: 'Getting Started',
        icon: '📅',
        title: 'How to create a meeting',
        summary: 'Schedule a new case meeting in 4 quick steps.',
        steps: [
            'Click "Meetings" in the top navigation, then click "Create Meeting" (top right).',
            'Fill in the title, description, meeting date, start and end times.',
            'Pick the meeting type (in-person / video / hybrid). For video, click "Generate Teams Link" to auto-create a Microsoft Teams meeting, or paste any video-platform URL manually.',
            'Step 2 → pick participants. Step 3 → pick or add patients. Step 4 → review the agenda checklist and click "Create Meeting".',
        ],
        related: ['change-meeting-timing', 'add-participant-existing'],
    },
    {
        id: 'change-meeting-timing',
        category: 'Getting Started',
        icon: '🕐',
        title: 'How to change the meeting timing',
        summary: 'Reschedule a meeting from its detail page.',
        steps: [
            'Open the meeting from the "Meetings" list.',
            'Click the "Edit Date & Time" button next to the meeting title.',
            'Update meeting date, start time, end time, or location, then click Save.',
            'All accepted participants will receive an updated invitation email automatically.',
        ],
        related: ['create-meeting'],
    },

    // ─── Participants & Patients ─────────────────────────────────
    {
        id: 'add-participant-wizard',
        category: 'Participants & Patients',
        icon: '👥',
        title: 'Add participant — existing or new',
        summary: 'During meeting creation, invite existing users or register new ones.',
        steps: [
            'In the meeting wizard, go to Step 2 (Participants).',
            'Use the "Existing Users" tab to pick doctors who already have accounts. Select multiple by clicking each row.',
            'For someone who isn\'t in the system yet, switch to the "New User" tab and fill in name, email, and specialty. They\'ll get an account-setup email.',
            'Continue to Step 3 when ready.',
        ],
        related: ['add-participant-existing'],
    },
    {
        id: 'add-participant-existing',
        category: 'Participants & Patients',
        icon: '➕',
        title: 'Add a participant to an existing meeting',
        summary: 'Invite someone after the meeting is already created.',
        steps: [
            'Open the meeting detail page.',
            'On the Overview tab, find the Participants sidebar (right side).',
            'Click "Add Participant".',
            'Pick an existing user or create a new one (same flow as the wizard). They will receive an invite email immediately.',
        ],
        related: ['add-participant-wizard'],
    },
    {
        id: 'add-patients',
        category: 'Participants & Patients',
        icon: '🧑‍⚕️',
        title: 'How to add patients — existing or new',
        summary: 'Reference an existing patient record or create a brand-new one.',
        steps: [
            'In the meeting wizard, go to Step 3 (Patients), or open an existing meeting → Patients tab → "Add Patient".',
            'Pick from your patient roster (with name, MRN, diagnosis) or click the "Create New Patient" tab.',
            'When creating a new patient, fill in basic info (name, MRN, gender, DOB, phone) and medical info (department, provider, diagnosis, allergies, medications, notes).',
            'Click Add Patient — they are immediately attached to the meeting and saved to your patient list for future use.',
        ],
        related: ['card-overview'],
    },
    {
        id: 'card-overview',
        category: 'Participants & Patients',
        icon: '📋',
        title: 'Overview of participant & patient cards',
        summary: 'Understand what each card shows at a glance.',
        steps: [
            'Participant card: shows the doctor\'s name, specialty, response status (pending / accepted / declined), and a remove icon (organizer only).',
            'Patient card: shows name, MRN, status badge, primary diagnosis, and clinical question. Pending patients show "⏳ Pending" until the organizer approves.',
            'Click "View Full Profile →" on any patient card to open their complete medical record.',
            'Cards rotate through 4 colors (teal, amber, purple, blue) so they\'re easy to scan visually.',
        ],
        related: [],
    },

    // ─── Agenda & Files ──────────────────────────────────────────
    {
        id: 'add-agenda',
        category: 'Agenda & Files',
        icon: '📝',
        title: 'Add an agenda item for a patient',
        summary: 'Create discussion items for the meeting.',
        steps: [
            'Open the meeting detail page → Agenda tab.',
            'Click "Add Agenda Item".',
            'Pick the patient, requested provider, diagnosis, reason for discussion, and tick whether radiology / pathology review is required.',
            'After the meeting, capture the discussion outcome in the "Treatment Plan" section of each agenda item.',
        ],
        related: ['treatment-plan-window', 'update-files'],
    },
    {
        id: 'treatment-plan-window',
        category: 'Agenda & Files',
        icon: '⏰',
        title: '7-day Treatment Plan edit window',
        summary: 'After meeting completion, treatment plans stay editable for 7 days.',
        steps: [
            'When the meeting is marked Completed, the agenda items are locked except for the Treatment Plan.',
            'You have 7 calendar days from the completion timestamp to edit each treatment plan.',
            'A yellow banner shows the days remaining; it turns red on the final day, then 🔒 read-only afterwards.',
            'Use this window to refine the plan after consulting with the team or reviewing reports.',
        ],
        related: ['add-agenda'],
    },
    {
        id: 'update-files',
        category: 'Agenda & Files',
        icon: '📎',
        title: 'Upload and manage files',
        summary: 'Attach radiology, pathology, lab reports, or consent forms to the meeting.',
        steps: [
            'Open the meeting detail page → Files tab.',
            'Click "Upload File", select the file and pick its type (radiology / pathology / lab report / consent form / other).',
            'Optionally tag the file to a specific patient so it shows up in their context.',
            'Files appear as colored cards with download and delete icons. Anyone in the meeting can view; only the uploader and the organizer can delete.',
        ],
        related: ['add-agenda'],
    },
];

export const TIP_CATEGORIES = [
    'Getting Started',
    'Participants & Patients',
    'Agenda & Files',
];
