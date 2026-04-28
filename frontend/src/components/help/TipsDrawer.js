import React, { useMemo, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb, ChevronRight, ChevronLeft, Search } from 'lucide-react';

// Inline tips data (kept in this file to avoid cross-file static analysis
// triggered by the preview-only visual-edits babel plugin on the iteration
// of the TIPS array inside JSX).
const TIPS_DATA = [
    { id: 'create-meeting', category: 'Getting Started', icon: '📅',
      title: 'How to create a meeting',
      summary: 'Schedule a new case meeting in 4 quick steps.',
      steps: [
        'Click "Meetings" in the top navigation, then click "Create Meeting" (top right).',
        'Fill in the title, description, meeting date, start and end times.',
        'Pick the meeting type. For video, click "Generate Teams Link" to auto-create a Microsoft Teams meeting, or paste any video-platform URL manually.',
        'Step 2 → pick participants. Step 3 → pick or add patients. Step 4 → review the agenda checklist and click "Create Meeting".',
      ], related: ['change-meeting-timing', 'add-participant-existing'] },
    { id: 'change-meeting-timing', category: 'Getting Started', icon: '🕐',
      title: 'How to change the meeting timing',
      summary: 'Reschedule a meeting from its detail page.',
      steps: [
        'Open the meeting from the "Meetings" list.',
        'Click the "Edit Date & Time" button next to the meeting title.',
        'Update meeting date, start time, end time, or location, then click Save.',
        'All accepted participants will receive an updated invitation email automatically.',
      ], related: ['create-meeting'] },
    { id: 'add-participant-wizard', category: 'Participants & Patients', icon: '👥',
      title: 'Add participant — existing or new',
      summary: 'During meeting creation, invite existing users or register new ones.',
      steps: [
        'In the meeting wizard, go to Step 2 (Participants).',
        'Use the "Existing Users" tab to pick doctors who already have accounts.',
        'For someone who isn\'t in the system yet, switch to the "New User" tab and fill in name, email, and specialty.',
        'Continue to Step 3 when ready.',
      ], related: ['add-participant-existing'] },
    { id: 'add-participant-existing', category: 'Participants & Patients', icon: '➕',
      title: 'Add a participant to an existing meeting',
      summary: 'Invite someone after the meeting is already created.',
      steps: [
        'Open the meeting detail page.',
        'On the Overview tab, find the Participants sidebar (right side).',
        'Click "Add Participant".',
        'Pick an existing user or create a new one. They will receive an invite email immediately.',
      ], related: ['add-participant-wizard'] },
    { id: 'add-patients', category: 'Participants & Patients', icon: '🧑‍⚕️',
      title: 'How to add patients — existing or new',
      summary: 'Reference an existing patient record or create a brand-new one.',
      steps: [
        'In the meeting wizard, go to Step 3, or open an existing meeting → Patients tab → "Add Patient".',
        'Pick from your patient roster or click the "Create New Patient" tab.',
        'Fill in basic info (name, MRN, gender, DOB) and medical info (department, diagnosis, allergies, medications).',
        'Click Add Patient — they are attached to the meeting and saved to your patient list for future use.',
      ], related: ['card-overview'] },
    { id: 'card-overview', category: 'Participants & Patients', icon: '📋',
      title: 'Overview of participant & patient cards',
      summary: 'Understand what each card shows at a glance.',
      steps: [
        'Participant card: doctor\'s name, specialty, response status, and a remove icon (organizer only).',
        'Patient card: name, MRN, status badge, primary diagnosis, and clinical question. Pending patients show "⏳ Pending" until approved.',
        'Click "View Full Profile →" on any patient card to open their complete medical record.',
        'Cards rotate through 4 colors (teal, amber, purple, blue) so they\'re easy to scan visually.',
      ], related: [] },
    { id: 'add-agenda', category: 'Agenda & Files', icon: '📝',
      title: 'Add an agenda item for a patient',
      summary: 'Create discussion items for the meeting.',
      steps: [
        'Open the meeting detail page → Agenda tab.',
        'Click "Add Agenda Item".',
        'Pick the patient, requested provider, diagnosis, reason for discussion, and tick whether radiology / pathology review is required.',
        'After the meeting, capture the discussion outcome in the "Treatment Plan" section of each agenda item.',
      ], related: ['treatment-plan-window', 'update-files'] },
    { id: 'treatment-plan-window', category: 'Agenda & Files', icon: '⏰',
      title: '7-day Treatment Plan edit window',
      summary: 'After meeting completion, treatment plans stay editable for 7 days.',
      steps: [
        'When the meeting is marked Completed, the agenda items are locked except for the Treatment Plan.',
        'You have 7 calendar days from the completion timestamp to edit each treatment plan.',
        'A yellow banner shows the days remaining; it turns red on the final day, then 🔒 read-only afterwards.',
        'Use this window to refine the plan after consulting with the team or reviewing reports.',
      ], related: ['add-agenda'] },
    { id: 'update-files', category: 'Agenda & Files', icon: '📎',
      title: 'Upload and manage files',
      summary: 'Attach radiology, pathology, lab reports, or consent forms to the meeting.',
      steps: [
        'Open the meeting detail page → Files tab.',
        'Click "Upload File", select the file and pick its type (radiology / pathology / lab report / consent form / other).',
        'Optionally tag the file to a specific patient so it shows up in their context.',
        'Files appear as colored cards with download and delete icons. Anyone in the meeting can view; only the uploader and the organizer can delete.',
      ], related: ['add-agenda'] },
    { id: 'use-holidays-settings', category: 'Settings & Help', icon: '📆',
      title: 'How to use Holidays in Settings',
      summary: 'Block meeting scheduling on the holidays you observe.',
      steps: [
        'Click your avatar → Profile → Settings tab.',
        'In the "Holidays" card, toggle "Enforcement on/off" at the top right.',
        'Tick the default holidays for your country (US/India/UK) you want enforced.',
        'Add a custom holiday with name + date. Tick "Repeat yearly" if it\'s recurring.',
        'Click "Save Holiday Preferences". Meeting creation on those dates will be blocked.',
      ], related: ['create-meeting'] },
    { id: 'send-feedback', category: 'Settings & Help', icon: '💬',
      title: 'How to send feedback',
      summary: 'Found a bug or have an idea? Tell us — we read everything.',
      steps: [
        'Click your avatar → Profile → Feedback tab.',
        'Choose a type: Feature Request, Bug Report, General Feedback, or Other.',
        'Add a short Subject and a detailed Message.',
        'Click "Submit Feedback". You\'ll get a confirmation toast — your message lands in our queue.',
      ], related: [] },
];

const CAT_ORDER = [
    'Getting Started',
    'Participants & Patients',
    'Agenda & Files',
    'Settings & Help',
];

const PALETTE = [
    { light: '#e8f5f0', dark: '#3b6658' },
    { light: '#f5f0e8', dark: '#694e20' },
    { light: '#f3edf5', dark: '#68517d' },
    { light: '#e8e8f5', dark: '#0b0b30' },
];

export default function TipsDrawer() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeId, setActiveId] = useState(null);

    const q = query.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return TIPS_DATA;
        return TIPS_DATA.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.summary.toLowerCase().includes(q) ||
                t.steps.some((s) => s.toLowerCase().includes(q))
        );
    }, [q]);

    const grouped = useMemo(
        () =>
            CAT_ORDER.map((cat) => ({
                category: cat,
                tips: filtered.filter((t) => t.category === cat),
            })),
        [filtered]
    );

    const activeTip = activeId ? TIPS_DATA.find((t) => t.id === activeId) : null;
    const colorFor = (id) => {
        const idx = TIPS_DATA.findIndex((t) => t.id === id);
        return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
    };

    const onOpenChange = (next) => {
        setOpen(next);
        if (!next) {
            setActiveId(null);
            setQuery('');
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                    title="Tips & Help"
                    data-testid="tips-button"
                >
                    <Lightbulb className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 flex flex-col"
                data-testid="tips-drawer"
            >
                <SheetHeader className="px-5 py-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-lg">
                        {activeTip ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setActiveId(null)}
                                    className="h-8 w-8 -ml-2"
                                    data-testid="tip-back-btn"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-base">
                                    {activeTip.icon} {activeTip.title}
                                </span>
                            </>
                        ) : (
                            <>
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                Tips &amp; Help
                            </>
                        )}
                    </SheetTitle>
                </SheetHeader>

                {!activeTip && (
                    <div className="px-5 py-3 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search tips…"
                                className="pl-9"
                                data-testid="tips-search"
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-5">
                    {activeTip ? (
                        <div className="space-y-5">
                            <div
                                className="p-4 rounded-lg"
                                style={{ backgroundColor: colorFor(activeTip.id).light }}
                            >
                                <p
                                    className="text-sm"
                                    style={{ color: colorFor(activeTip.id).dark }}
                                >
                                    {activeTip.summary}
                                </p>
                            </div>
                            <ol className="space-y-3">
                                {activeTip.steps.map((step, idx) => (
                                    <li key={idx} className="flex gap-3">
                                        <span
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 text-white"
                                            style={{
                                                backgroundColor: colorFor(activeTip.id).dark,
                                            }}
                                        >
                                            {idx + 1}
                                        </span>
                                        <p className="text-sm leading-relaxed text-slate-700">
                                            {step}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                            {activeTip.related.length > 0 && (
                                <div className="pt-4 border-t">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                        Related
                                    </p>
                                    <div className="space-y-1">
                                        {activeTip.related.map((rid) => {
                                            const r = TIPS_DATA.find((t) => t.id === rid);
                                            if (!r) return null;
                                            return (
                                                <button
                                                    key={rid}
                                                    onClick={() => setActiveId(rid)}
                                                    className="w-full text-left text-sm text-primary hover:underline"
                                                    data-testid={`tip-related-${rid}`}
                                                >
                                                    → {r.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">
                            No tips match your search. Try a different keyword.
                        </p>
                    ) : (
                        <div className="space-y-6">
                            {grouped.map((group) => {
                                if (group.tips.length === 0) return null;
                                return (
                                    <div key={group.category}>
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                            {group.category}
                                        </h3>
                                        <div className="space-y-2">
                                            {group.tips.map((t) => {
                                                const c = colorFor(t.id);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => setActiveId(t.id)}
                                                        className="w-full text-left p-3 rounded-lg border-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3"
                                                        style={{ backgroundColor: c.light }}
                                                        data-testid={`tip-card-${t.id}`}
                                                    >
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            <span className="text-xl">
                                                                {t.icon}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p
                                                                    className="font-semibold text-sm truncate"
                                                                    style={{ color: c.dark }}
                                                                >
                                                                    {t.title}
                                                                </p>
                                                                <p
                                                                    className="text-xs mt-0.5 truncate"
                                                                    style={{
                                                                        color: c.dark,
                                                                        opacity: 0.7,
                                                                    }}
                                                                >
                                                                    {t.summary}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight
                                                            className="w-4 h-4 mt-1 flex-shrink-0"
                                                            style={{ color: c.dark }}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
