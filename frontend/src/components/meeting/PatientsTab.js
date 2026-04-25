import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Trash2, Check } from 'lucide-react';
import { colorAt } from '@/lib/meetingColors';

export default function PatientsTab({
    meeting,
    isOrganizer,
    onAddPatientClick,
    onRemovePatient,
    onApprovePatient,
}) {
    const patients = meeting?.patients || [];
    const canMutate = meeting?.status !== 'completed';
    const canRemove = isOrganizer && canMutate;

    const isEmpty = patients.length === 0;

    return (
        <>
            <div className="flex justify-end mb-4">
                {canMutate && (
                    <Button
                        onClick={onAddPatientClick}
                        className="bg-primary hover:bg-primary/90"
                        data-testid="add-patient-btn"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Patient
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEmpty ? (
                    <Card className="border-slate-200 col-span-2">
                        <CardContent className="py-12 text-center">
                            <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">
                                No patients added to this meeting
                            </p>
                            {canMutate && (
                                <Button
                                    onClick={onAddPatientClick}
                                    variant="outline"
                                    className="mt-4"
                                    data-testid="add-first-patient-btn"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add First Patient
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                        {patients.map((mp, idx) => {
                            const colors = colorAt(idx);
                            const isPending = mp.approval_status === 'pending';

                            return (
                                <Card
                                    key={mp.id}
                                    className="border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 overflow-hidden bg-white flex flex-col"
                                    style={{
                                        backgroundColor: colors.light,
                                        minHeight: '380px',
                                    }}
                                    data-testid={`meeting-patient-${idx}`}
                                >
                                    <CardContent className="pt-4 pb-3 flex-1 flex flex-col">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: colors.dark }}
                                            >
                                                <User className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3
                                                            className="font-semibold text-base mb-1.5"
                                                            style={{ color: colors.dark }}
                                                        >
                                                            {mp.first_name} {mp.last_name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs capitalize"
                                                                style={{
                                                                    borderColor: colors.dark,
                                                                    color: colors.dark,
                                                                }}
                                                            >
                                                                {mp.status?.replace('_', ' ')}
                                                            </Badge>
                                                            {isPending && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs bg-amber-100 text-amber-800 border-amber-300"
                                                                >
                                                                    ⏳ Pending
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {canRemove && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                onRemovePatient(mp.patient_id)
                                                            }
                                                            className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8"
                                                            title="Remove patient"
                                                            data-testid={`remove-patient-${idx}`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>

                                                {mp.patient_id_number && (
                                                    <p
                                                        className="text-xs mb-1.5"
                                                        style={{
                                                            color: colors.dark,
                                                            opacity: 0.7,
                                                        }}
                                                    >
                                                        MRN: {mp.patient_id_number}
                                                    </p>
                                                )}

                                                {mp.added_by_name && (
                                                    <p
                                                        className="text-xs mb-1.5"
                                                        style={{
                                                            color: colors.dark,
                                                            opacity: 0.6,
                                                        }}
                                                    >
                                                        Added by: {mp.added_by_name}
                                                    </p>
                                                )}

                                                {mp.approval_status === 'approved' &&
                                                    mp.approved_by_name && (
                                                        <p className="text-xs mb-2 text-green-700 font-medium">
                                                            ✓ Approved by {mp.approved_by_name}
                                                        </p>
                                                    )}

                                                {mp.primary_diagnosis && (
                                                    <p
                                                        className="text-sm mt-1.5 mb-1.5 font-semibold"
                                                        style={{ color: colors.dark }}
                                                    >
                                                        {mp.primary_diagnosis}
                                                    </p>
                                                )}

                                                {mp.clinical_question && (
                                                    <div
                                                        className="mt-2 mb-2 p-2.5 rounded-lg"
                                                        style={{
                                                            backgroundColor: `${colors.dark}15`,
                                                        }}
                                                    >
                                                        <p
                                                            className="text-xs mb-1 font-semibold"
                                                            style={{
                                                                color: colors.dark,
                                                                opacity: 0.7,
                                                            }}
                                                        >
                                                            Clinical Question
                                                        </p>
                                                        <p
                                                            className="text-xs leading-relaxed"
                                                            style={{ color: colors.dark }}
                                                        >
                                                            {mp.clinical_question}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1"></div>

                                        {isOrganizer && isPending && canMutate && (
                                            <Button
                                                onClick={() =>
                                                    onApprovePatient(mp.patient_id)
                                                }
                                                className="mt-3 w-full bg-green-600 hover:bg-green-700 py-2"
                                                size="sm"
                                                data-testid={`approve-patient-${idx}`}
                                            >
                                                <Check className="w-4 h-4 mr-2" />
                                                Approve Patient
                                            </Button>
                                        )}
                                    </CardContent>

                                    <Link
                                        to={`/patients/${mp.patient_id}`}
                                        className="block mt-auto"
                                    >
                                        <div
                                            className="relative py-2.5 px-4 text-center font-semibold text-white transition-all duration-300 hover:opacity-90 cursor-pointer text-sm"
                                            style={{
                                                backgroundColor: colors.dark,
                                                clipPath:
                                                    'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                                            }}
                                        >
                                            <span className="relative z-10">
                                                View Full Profile →
                                            </span>
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black opacity-10"></div>
                                        </div>
                                    </Link>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
