// Helper utilities for the 7-day post-completion edit window on meeting
// treatment plans. Extracted from MeetingDetailPage for reuse and clarity.

export const TREATMENT_PLAN_EDIT_WINDOW_DAYS = 7;

// Whether the treatment plan can still be edited:
//   - Always editable while the meeting is not yet `completed`.
//   - After completion, editable for 7 days from `completed_at`.
export const isTreatmentPlanEditable = (meeting) => {
    if (!meeting || meeting.status !== 'completed') {
        return true;
    }
    if (!meeting.completed_at) {
        return true;
    }
    const completedAt = new Date(meeting.completed_at);
    const now = new Date();
    const daysSinceCompletion = Math.floor(
        (now - completedAt) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCompletion <= TREATMENT_PLAN_EDIT_WINDOW_DAYS;
};

// Number of days remaining in the edit window (null when not applicable).
export const getRemainingEditDays = (meeting) => {
    if (!meeting || meeting.status !== 'completed' || !meeting.completed_at) {
        return null;
    }
    const completedAt = new Date(meeting.completed_at);
    const now = new Date();
    const daysSinceCompletion = Math.floor(
        (now - completedAt) / (1000 * 60 * 60 * 24)
    );
    const remaining = TREATMENT_PLAN_EDIT_WINDOW_DAYS - daysSinceCompletion;
    return remaining >= 0 ? remaining : 0;
};
