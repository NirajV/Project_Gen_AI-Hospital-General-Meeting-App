import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clipboard, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const DECISION_CARD_COLORS = [
    { light: '#e8f5f0', dark: '#3b6658' }, // Teal
    { light: '#f5f0e8', dark: '#694e20' }, // Amber
    { light: '#f3edf5', dark: '#68517d' }, // Purple
    { light: '#e8e8f5', dark: '#0b0b30' }, // Blue
];

export default function DecisionsTab({
    meeting,
    isOrganizer,
    onAddClick,
    onDeleteDecision,
}) {
    const decisions = meeting?.decisions || [];
    const patients = meeting?.patients || [];
    const canDelete = isOrganizer && meeting?.status !== 'completed';

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button
                    onClick={onAddClick}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="add-decision-btn"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Decision
                </Button>
            </div>

            {decisions.length === 0 ? (
                <Card className="border-slate-200">
                    <CardContent className="py-12 text-center">
                        <Clipboard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No decisions recorded yet</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {decisions.map((decision, idx) => {
                        const decisionPatient = patients.find(
                            (p) => p.patient_id === decision.meeting_patient_id
                        );
                        const colors =
                            DECISION_CARD_COLORS[idx % DECISION_CARD_COLORS.length];

                        return (
                            <Card
                                key={decision.id}
                                className="border-0 shadow-sm hover:shadow-lg transition-all duration-300"
                                style={{ backgroundColor: colors.light }}
                                data-testid={`decision-${idx}`}
                            >
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3
                                                    className="font-semibold"
                                                    style={{ color: colors.dark }}
                                                >
                                                    {decision.title}
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                    style={{
                                                        borderColor: colors.dark,
                                                        color: colors.dark,
                                                    }}
                                                >
                                                    {decision.priority}
                                                </Badge>
                                                <Badge
                                                    className={
                                                        decision.status === 'completed'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                    }
                                                >
                                                    {decision.status}
                                                </Badge>
                                            </div>

                                            {decisionPatient && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                        style={{
                                                            borderColor: colors.dark,
                                                            color: colors.dark,
                                                        }}
                                                    >
                                                        👤 {decisionPatient.first_name}{' '}
                                                        {decisionPatient.last_name}
                                                    </Badge>
                                                    {decisionPatient.patient_id_number && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs font-mono"
                                                            style={{
                                                                backgroundColor: `${colors.dark}20`,
                                                                color: colors.dark,
                                                            }}
                                                        >
                                                            MRN: {decisionPatient.patient_id_number}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            {decision.description && (
                                                <p
                                                    className="text-sm mt-2"
                                                    style={{ color: colors.dark, opacity: 0.8 }}
                                                >
                                                    {decision.description}
                                                </p>
                                            )}

                                            {decision.action_plan && (
                                                <div
                                                    className="mt-3 p-3 rounded"
                                                    style={{
                                                        backgroundColor: `${colors.dark}15`,
                                                    }}
                                                >
                                                    <p
                                                        className="text-xs font-medium"
                                                        style={{ color: colors.dark, opacity: 0.7 }}
                                                    >
                                                        Action Plan
                                                    </p>
                                                    <p
                                                        className="text-sm mt-1"
                                                        style={{ color: colors.dark }}
                                                    >
                                                        {decision.action_plan}
                                                    </p>
                                                </div>
                                            )}

                                            {decision.follow_up_date && (
                                                <p
                                                    className="text-xs mt-2"
                                                    style={{ color: colors.dark, opacity: 0.7 }}
                                                >
                                                    Follow-up:{' '}
                                                    {format(
                                                        parseISO(decision.follow_up_date),
                                                        'MMM d, yyyy'
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        {canDelete && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteDecision(decision.id)}
                                                className="text-muted-foreground hover:text-destructive ml-2"
                                                title="Delete decision"
                                                data-testid={`decision-delete-${idx}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </>
    );
}
