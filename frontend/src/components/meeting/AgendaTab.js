import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clipboard, Trash2, AlertCircle } from 'lucide-react';
import {
    isTreatmentPlanEditable,
    getRemainingEditDays,
} from '@/lib/treatmentPlanUtils';

const AGENDA_CARD_COLORS = [
    { light: '#e8f5f0', dark: '#3b6658' }, // Teal
    { light: '#f5f0e8', dark: '#694e20' }, // Amber
    { light: '#f3edf5', dark: '#68517d' }, // Purple
    { light: '#e8e8f5', dark: '#0b0b30' }, // Blue
];

export default function AgendaTab({
    meeting,
    isOrganizer,
    onAddClick,
    onDeleteAgenda,
    editingTreatmentPlan,
    setEditingTreatmentPlan,
    treatmentPlanText,
    setTreatmentPlanText,
    onSaveTreatmentPlan,
}) {
    const agenda = meeting?.agenda || [];
    const canMutate = meeting?.status !== 'completed';
    const editable = isTreatmentPlanEditable(meeting);
    const remainingDays = getRemainingEditDays(meeting);
    const isEmpty = agenda.length === 0;

    return (
        <Card className="border-slate-200">
            <CardContent className="pt-6">
                {isEmpty ? (
                    <div className="text-center py-8">
                        <Clipboard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No agenda items</p>
                        {canMutate && (
                            <Button
                                onClick={onAddClick}
                                variant="outline"
                                className="mt-4"
                                data-testid="add-first-agenda-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add First Agenda Item
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        {canMutate && (
                            <div className="flex justify-end mb-4">
                                <Button
                                    onClick={onAddClick}
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90"
                                    data-testid="add-agenda-btn"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Agenda Item
                                </Button>
                            </div>
                        )}
                        <div className="space-y-4">
                            {agenda.map((item, idx) => {
                                const isEditing = editingTreatmentPlan[item.id];
                                const currentTreatmentPlan =
                                    treatmentPlanText[item.id] !== undefined
                                        ? treatmentPlanText[item.id]
                                        : item.treatment_plan;
                                const colors =
                                    AGENDA_CARD_COLORS[idx % AGENDA_CARD_COLORS.length];

                                return (
                                    <div
                                        key={item.id}
                                        className="p-6 rounded-lg border-0 shadow-sm hover:shadow-lg transition-all duration-300 space-y-4"
                                        style={{ backgroundColor: colors.light }}
                                        data-testid={`agenda-item-${idx}`}
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant="outline"
                                                    className="text-lg px-3 py-1"
                                                    style={{
                                                        borderColor: colors.dark,
                                                        color: colors.dark,
                                                    }}
                                                >
                                                    {idx + 1}
                                                </Badge>
                                                <div>
                                                    <h3
                                                        className="text-lg font-semibold"
                                                        style={{ color: colors.dark }}
                                                    >
                                                        {item.patient_name || 'Unknown Patient'}
                                                    </h3>
                                                    <p
                                                        className="text-sm"
                                                        style={{
                                                            color: colors.dark,
                                                            opacity: 0.7,
                                                        }}
                                                    >
                                                        MRN:{' '}
                                                        <span className="font-mono">
                                                            {item.mrn}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isOrganizer && canMutate && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onDeleteAgenda(item.id)}
                                                        className="text-muted-foreground hover:text-destructive"
                                                        title="Delete agenda item"
                                                        data-testid={`delete-agenda-${idx}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Medical Info Grid */}
                                        <div
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"
                                            style={{
                                                borderTop: `1px solid ${colors.dark}30`,
                                                borderBottom: `1px solid ${colors.dark}30`,
                                            }}
                                        >
                                            <div>
                                                <p
                                                    className="text-xs font-medium uppercase mb-1"
                                                    style={{
                                                        color: colors.dark,
                                                        opacity: 0.6,
                                                    }}
                                                >
                                                    Requested Provider
                                                </p>
                                                <p
                                                    className="text-sm font-medium"
                                                    style={{ color: colors.dark }}
                                                >
                                                    {item.requested_provider}
                                                </p>
                                            </div>
                                            <div>
                                                <p
                                                    className="text-xs font-medium uppercase mb-1"
                                                    style={{
                                                        color: colors.dark,
                                                        opacity: 0.6,
                                                    }}
                                                >
                                                    Diagnosis
                                                </p>
                                                <p
                                                    className="text-sm font-medium"
                                                    style={{ color: colors.dark }}
                                                >
                                                    {item.diagnosis}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Reason for Discussion */}
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                                                Reason For Discussion
                                            </p>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {item.reason_for_discussion}
                                            </p>
                                        </div>

                                        {/* Review Requirements */}
                                        <div className="flex gap-3">
                                            {item.pathology_required && (
                                                <Badge
                                                    variant="secondary"
                                                    className="px-3 py-1"
                                                >
                                                    ✓ Pathology Review Required
                                                </Badge>
                                            )}
                                            {item.radiology_required && (
                                                <Badge
                                                    variant="secondary"
                                                    className="px-3 py-1"
                                                >
                                                    ✓ Radiology Review Required
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Treatment Plan Section */}
                                        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    Treatment Plan
                                                </p>
                                                {editable ? (
                                                    <>
                                                        {!isEditing ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setEditingTreatmentPlan({
                                                                        ...editingTreatmentPlan,
                                                                        [item.id]: true,
                                                                    });
                                                                    setTreatmentPlanText({
                                                                        ...treatmentPlanText,
                                                                        [item.id]:
                                                                            item.treatment_plan ||
                                                                            '',
                                                                    });
                                                                }}
                                                                data-testid={`edit-tp-${idx}`}
                                                            >
                                                                📝 Edit
                                                            </Button>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        onSaveTreatmentPlan(
                                                                            item.id
                                                                        )
                                                                    }
                                                                    data-testid={`save-tp-${idx}`}
                                                                >
                                                                    💾 Save
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setEditingTreatmentPlan({
                                                                            ...editingTreatmentPlan,
                                                                            [item.id]: false,
                                                                        });
                                                                        setTreatmentPlanText({
                                                                            ...treatmentPlanText,
                                                                            [item.id]:
                                                                                item.treatment_plan,
                                                                        });
                                                                    }}
                                                                    data-testid={`cancel-tp-${idx}`}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Badge
                                                        variant="destructive"
                                                        className="text-xs"
                                                    >
                                                        🔒 Editing Disabled
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* 7-Day Warning */}
                                            {meeting.status === 'completed' &&
                                                remainingDays !== null && (
                                                    <div
                                                        className={`mb-3 p-2 rounded text-xs ${
                                                            remainingDays > 0
                                                                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                                                                : 'bg-red-50 border border-red-200 text-red-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4" />
                                                            {remainingDays > 0 ? (
                                                                <span>
                                                                    ⚠️ Treatment plan can be
                                                                    edited for {remainingDays}{' '}
                                                                    more day
                                                                    {remainingDays !== 1
                                                                        ? 's'
                                                                        : ''}{' '}
                                                                    after meeting completion.
                                                                </span>
                                                            ) : (
                                                                <span>
                                                                    🔒 The 7-day edit window
                                                                    has expired. Treatment plan
                                                                    is now read-only.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                            {isEditing ? (
                                                <Textarea
                                                    value={currentTreatmentPlan}
                                                    onChange={(e) =>
                                                        setTreatmentPlanText({
                                                            ...treatmentPlanText,
                                                            [item.id]: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Enter treatment plan notes..."
                                                    className="min-h-[100px]"
                                                    data-testid={`tp-textarea-${idx}`}
                                                />
                                            ) : (
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                    {item.treatment_plan || (
                                                        <span className="text-slate-400 italic">
                                                            No treatment plan entered yet
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                            {item.updated_at && (
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Last updated:{' '}
                                                    {new Date(
                                                        item.updated_at
                                                    ).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
