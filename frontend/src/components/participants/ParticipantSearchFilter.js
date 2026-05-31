import React from 'react';
import { CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export const ParticipantSearchFilter = ({
    searchQuery,
    onSearchChange,
    filterRole,
    onFilterChange,
    roles,
}) => (
    <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search by name, email, or specialty..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                    data-testid="participant-search-input"
                />
            </div>
            <div className="flex gap-2">
                {roles.map((role) => (
                    <Button
                        key={role}
                        size="sm"
                        variant={filterRole === role ? 'default' : 'outline'}
                        onClick={() => onFilterChange(role)}
                        className="capitalize"
                        data-testid={`participant-filter-${role}`}
                    >
                        {role}
                    </Button>
                ))}
            </div>
        </div>
    </CardHeader>
);
