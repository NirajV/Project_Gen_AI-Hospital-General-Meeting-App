import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Heart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PATIENT_CARD_COLORS } from './patientDetailUtils';

const TreatmentPlanCard = ({ plan, colors }) => (
    <Card
        className="border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 bg-white overflow-hidden"
        style={{ backgroundColor: colors.light }}
    >
        <CardContent className="pt-6 pb-0">
            {/* Header with Meeting Info */}
            <div
                className="flex items-start justify-between mb-4 pb-4"
                style={{ borderBottom: `2px solid ${colors.dark}` }}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: colors.dark }}
                        >
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg" style={{ color: colors.dark }}>
                                {plan.meeting_title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge
                                    variant="outline"
                                    className="text-xs"
                                    style={{ borderColor: colors.dark, color: colors.dark }}
                                >
                                    {format(parseISO(plan.meeting_date), 'MMMM d, yyyy')}
                                </Badge>
                                <Link to={`/meetings/${plan.meeting_id}`}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs"
                                        style={{ color: colors.dark }}
                                    >
                                        View Meeting →
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Medical Details */}
            {(plan.diagnosis || plan.requested_provider) && (
                <div
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 rounded-lg"
                    style={{ backgroundColor: `${colors.dark}10` }}
                >
                    {plan.diagnosis && (
                        <div>
                            <p
                                className="text-xs font-medium uppercase mb-1"
                                style={{ color: colors.dark, opacity: 0.7 }}
                            >
                                Diagnosis
                            </p>
                            <p className="text-sm font-semibold" style={{ color: colors.dark }}>
                                {plan.diagnosis}
                            </p>
                        </div>
                    )}
                    {plan.requested_provider && (
                        <div>
                            <p
                                className="text-xs font-medium uppercase mb-1"
                                style={{ color: colors.dark, opacity: 0.7 }}
                            >
                                Requested Provider
                            </p>
                            <p className="text-sm font-semibold" style={{ color: colors.dark }}>
                                {plan.requested_provider}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Treatment Plan Content */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4" style={{ color: colors.dark }} />
                    <h4 className="font-semibold" style={{ color: colors.dark }}>Treatment Plan</h4>
                </div>
                <div className="prose prose-sm max-w-none">
                    <p
                        className="text-sm whitespace-pre-wrap leading-relaxed"
                        style={{ color: colors.dark, opacity: 0.9 }}
                    >
                        {plan.treatment_plan}
                    </p>
                </div>
            </div>
        </CardContent>

        {/* Ribbon Footer */}
        <Link to={`/meetings/${plan.meeting_id}`} className="block">
            <div
                className="relative py-3 px-4 text-center font-semibold text-white transition-all duration-300 hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: colors.dark }}
            >
                <span className="relative z-10">View Full Meeting Details →</span>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black opacity-10"></div>
            </div>
        </Link>
    </Card>
);

export const PatientTreatmentPlansTab = ({ plans }) => {
    if (!plans || plans.length === 0) {
        return (
            <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No treatment plans found for this patient</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 p-4 bg-white">
            {plans.map((plan, idx) => (
                <TreatmentPlanCard
                    key={plan.id}
                    plan={plan}
                    colors={PATIENT_CARD_COLORS[idx % PATIENT_CARD_COLORS.length]}
                />
            ))}
        </div>
    );
};
