import React, { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { TIPS, TIP_CATEGORIES } from '@/lib/tipsContent';

const CARD_COLORS = [
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
    const filteredTips = useMemo(() => {
        if (!q) return TIPS;
        return TIPS.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.summary.toLowerCase().includes(q) ||
                t.steps.some((s) => s.toLowerCase().includes(q))
        );
    }, [q]);

    const tipsByCategory = useMemo(() => {
        const map = {};
        TIP_CATEGORIES.forEach((c) => (map[c] = []));
        filteredTips.forEach((t) => {
            if (!map[t.category]) map[t.category] = [];
            map[t.category].push(t);
        });
        return map;
    }, [filteredTips]);

    const activeTip = useMemo(
        () => (activeId ? TIPS.find((t) => t.id === activeId) : null),
        [activeId]
    );

    const tipIndex = (id) => TIPS.findIndex((t) => t.id === id);
    const colorFor = (id) => CARD_COLORS[tipIndex(id) % CARD_COLORS.length];

    const goBack = () => setActiveId(null);

    const onOpenChange = (next) => {
        setOpen(next);
        if (!next) {
            // Reset on close so the user starts from the list next time.
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
                                    onClick={goBack}
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
                        <TipDetail
                            tip={activeTip}
                            color={colorFor(activeTip.id)}
                            onOpenRelated={(id) => setActiveId(id)}
                        />
                    ) : (
                        <TipList
                            tipsByCategory={tipsByCategory}
                            colorFor={colorFor}
                            onOpen={(id) => setActiveId(id)}
                            empty={filteredTips.length === 0}
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function TipList({ tipsByCategory, colorFor, onOpen, empty }) {
    if (empty) {
        return (
            <p className="text-sm text-muted-foreground text-center py-10">
                No tips match your search. Try a different keyword.
            </p>
        );
    }
    return (
        <div className="space-y-6">
            {Object.entries(tipsByCategory).map(([category, tips]) => {
                if (!tips.length) return null;
                return (
                    <div key={category}>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            {category}
                        </h3>
                        <div className="space-y-2">
                            {tips.map((t) => {
                                const c = colorFor(t.id);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onOpen(t.id)}
                                        className="w-full text-left p-3 rounded-lg border-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3"
                                        style={{ backgroundColor: c.light }}
                                        data-testid={`tip-card-${t.id}`}
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <span className="text-xl">{t.icon}</span>
                                            <div className="min-w-0">
                                                <p
                                                    className="font-semibold text-sm truncate"
                                                    style={{ color: c.dark }}
                                                >
                                                    {t.title}
                                                </p>
                                                <p
                                                    className="text-xs mt-0.5 truncate"
                                                    style={{ color: c.dark, opacity: 0.7 }}
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
    );
}

function TipDetail({ tip, color, onOpenRelated }) {
    return (
        <div className="space-y-5">
            <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: color.light }}
            >
                <p className="text-sm" style={{ color: color.dark }}>
                    {tip.summary}
                </p>
            </div>

            <ol className="space-y-3">
                {tip.steps.map((step, idx) => (
                    <li
                        key={idx}
                        className="flex gap-3"
                        data-testid={`tip-step-${idx}`}
                    >
                        <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: color.dark, color: 'white' }}
                        >
                            {idx + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-slate-700">{step}</p>
                    </li>
                ))}
            </ol>

            {tip.related && tip.related.length > 0 && (
                <div className="pt-4 border-t">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Related
                    </p>
                    <div className="space-y-1">
                        {tip.related.map((rid) => {
                            const r = TIPS.find((t) => t.id === rid);
                            if (!r) return null;
                            return (
                                <button
                                    key={rid}
                                    onClick={() => onOpenRelated(rid)}
                                    className="w-full text-left text-sm text-primary hover:underline flex items-center gap-1"
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
    );
}
