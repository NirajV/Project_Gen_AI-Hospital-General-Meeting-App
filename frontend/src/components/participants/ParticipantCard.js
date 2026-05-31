import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Briefcase, Edit2, X } from 'lucide-react';
import {
    PARTICIPANT_CARD_COLORS,
    getInitials,
    getRoleBadgeColor,
} from './participantUtils';

export const ParticipantCard = ({
    participant,
    index,
    isOrganizer,
    editingRoleId,
    onStartRoleEdit,
    onCancelRoleEdit,
    onRoleChange,
    updatingRole,
    onOpenEditDialog,
}) => {
    const colors = PARTICIPANT_CARD_COLORS[index % PARTICIPANT_CARD_COLORS.length];
    const isEditingThisRole = editingRoleId === participant.id;

    return (
        <div
            className="p-4 rounded-lg border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group bg-white"
            style={{ backgroundColor: colors.light }}
            data-testid={`participant-card-${participant.id}`}
        >
            <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12" style={{ backgroundColor: colors.dark }}>
                    <AvatarFallback
                        className="font-semibold text-white"
                        style={{ backgroundColor: colors.dark }}
                    >
                        {getInitials(participant.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3
                            className="font-semibold truncate group-hover:text-slate-900 transition-colors"
                            style={{ color: colors.dark }}
                        >
                            {participant.name}
                        </h3>
                        {isOrganizer && isEditingThisRole ? (
                            <div className="flex items-center gap-1">
                                <Select
                                    value={participant.role}
                                    onValueChange={(value) => onRoleChange(participant.id, value)}
                                    disabled={updatingRole}
                                >
                                    <SelectTrigger className="h-7 text-xs w-28">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="doctor">Doctor</SelectItem>
                                        <SelectItem value="nurse">Nurse</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="organizer">Organizer</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={onCancelRoleEdit}
                                    data-testid={`cancel-role-edit-${participant.id}`}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Badge
                                    variant="outline"
                                    className={`text-xs capitalize ${getRoleBadgeColor(participant.role)}`}
                                >
                                    {participant.role || 'Staff'}
                                </Badge>
                                {isOrganizer && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 hover:bg-primary/10"
                                        onClick={() => onStartRoleEdit(participant.id)}
                                        title="Change role"
                                        data-testid={`edit-role-${participant.id}`}
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {participant.specialty && (
                        <div
                            className="flex items-center gap-1 mt-1 text-sm"
                            style={{ color: colors.dark, opacity: 0.8 }}
                        >
                            <Briefcase className="w-3 h-3" />
                            <span className="truncate">{participant.specialty}</span>
                        </div>
                    )}

                    <div
                        className="flex items-center gap-1 mt-1 text-sm"
                        style={{ color: colors.dark, opacity: 0.8 }}
                    >
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{participant.email}</span>
                        {isOrganizer && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 ml-auto hover:bg-slate-200"
                                onClick={() => onOpenEditDialog(participant)}
                                title="Edit email and department"
                                data-testid={`edit-participant-${participant.id}`}
                            >
                                <Edit2 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>

                    {participant.phone && (
                        <div
                            className="flex items-center gap-1 mt-1 text-sm"
                            style={{ color: colors.dark, opacity: 0.8 }}
                        >
                            <Phone className="w-3 h-3" />
                            <span>{participant.phone}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
