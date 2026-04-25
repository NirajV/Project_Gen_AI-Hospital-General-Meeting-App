import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import { getFileUrl } from '@/lib/api';
import { colorAt } from '@/lib/meetingColors';

const DEFAULT_FILE_ICONS = {
    radiology: '🩻',
    pathology: '🧫',
    lab_report: '🧪',
    consent_form: '📋',
    other: '📄',
};

const defaultGetFileIcon = (type) =>
    DEFAULT_FILE_ICONS[type] || DEFAULT_FILE_ICONS.other;

export default function FilesTab({
    meeting,
    onUploadClick,
    onDeleteFile,
    getFileIcon = defaultGetFileIcon,
}) {
    const files = meeting?.files || [];
    const patients = meeting?.patients || [];

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button
                    onClick={onUploadClick}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="upload-file-btn"
                >
                    <Upload className="w-4 h-4 mr-2" /> Upload File
                </Button>
            </div>

            {files.length === 0 ? (
                <Card className="border-slate-200">
                    <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No files uploaded yet</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, idx) => {
                        const filePatient = patients.find(
                            (p) => p.patient_id === file.patient_id
                        );
                        const colors = colorAt(idx);

                        return (
                            <Card
                                key={file.id}
                                className="border-0 shadow-sm hover:shadow-lg transition-all duration-300"
                                style={{ backgroundColor: colors.light }}
                                data-testid={`file-${idx}`}
                            >
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            <span className="text-2xl">
                                                {getFileIcon(file.file_type)}
                                            </span>
                                            <div className="flex-1">
                                                <p
                                                    className="font-semibold text-sm truncate"
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
                                                <p
                                                    className="text-xs mt-1"
                                                    style={{ color: colors.dark, opacity: 0.7 }}
                                                >
                                                    By {file.uploader_name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" asChild>
                                                <a
                                                    href={getFileUrl(file.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    data-testid={`file-download-${idx}`}
                                                >
                                                    <Download
                                                        className="w-4 h-4"
                                                        style={{ color: colors.dark }}
                                                    />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteFile(file.id)}
                                                className="text-destructive"
                                                data-testid={`file-delete-${idx}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {filePatient && (
                                        <div
                                            className="pt-3"
                                            style={{
                                                borderTop: `1px solid ${colors.dark}30`,
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                    style={{
                                                        borderColor: colors.dark,
                                                        color: colors.dark,
                                                    }}
                                                >
                                                    👤 {filePatient.first_name}{' '}
                                                    {filePatient.last_name}
                                                </Badge>
                                                {filePatient.patient_id_number && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs font-mono"
                                                        style={{
                                                            backgroundColor: `${colors.dark}20`,
                                                            color: colors.dark,
                                                        }}
                                                    >
                                                        MRN: {filePatient.patient_id_number}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {!filePatient && file.patient_id && (
                                        <div
                                            className="pt-3"
                                            style={{
                                                borderTop: `1px solid ${colors.dark}30`,
                                            }}
                                        >
                                            <Badge
                                                variant="outline"
                                                className="text-xs text-slate-400"
                                            >
                                                Patient not found
                                            </Badge>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </>
    );
}
