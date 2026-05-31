import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { FileText, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { downloadFile } from '@/lib/api';
import { PATIENT_CARD_COLORS, getFileIcon } from './patientDetailUtils';

const handleDownload = async (file) => {
    try {
        await downloadFile(file.id, file.original_name);
    } catch (e) {
        toast.error(
            e?.response?.status === 401
                ? 'Please sign in to download files.'
                : 'Failed to download file. Please try again.'
        );
    }
};

export const PatientFilesTab = ({ files }) => {
    if (!files || files.length === 0) {
        return (
            <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No files uploaded for this patient</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
            {files.map((file, idx) => {
                const colors = PATIENT_CARD_COLORS[idx % PATIENT_CARD_COLORS.length];
                return (
                    <Card
                        key={file.id}
                        className="border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 bg-white"
                        style={{ backgroundColor: colors.light }}
                        data-testid={`patient-file-${idx}`}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{getFileIcon(file.file_type)}</span>
                                    <div>
                                        <p
                                            className="font-semibold text-sm truncate max-w-[150px]"
                                            style={{ color: colors.dark }}
                                        >
                                            {file.original_name}
                                        </p>
                                        <p
                                            className="text-xs capitalize"
                                            style={{ color: colors.dark, opacity: 0.7 }}
                                        >
                                            {file.file_type?.replace('_', ' ')}
                                        </p>
                                        {file.created_at && (
                                            <p
                                                className="text-xs mt-1"
                                                style={{ color: colors.dark, opacity: 0.7 }}
                                            >
                                                {format(parseISO(file.created_at), 'MMM d, yyyy')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownload(file)}
                                    aria-label={`Download ${file.original_name}`}
                                >
                                    <Download className="w-4 h-4" style={{ color: colors.dark }} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};
