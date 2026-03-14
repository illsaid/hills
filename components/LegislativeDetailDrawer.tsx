'use client';

import { X, ExternalLink, Calendar, Tag, Truck, Building, Newspaper, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LegislativeUpdate {
    id: string;
    title: string;
    category: string;
    date: string;
    summary: string;
    impact_label: 'Logistics Update' | 'Property Intelligence' | null;
    source_url: string;
    source_name: string;
}

interface RelatedItem {
    id: string;
    title: string;
    date: string;
    href?: string;
    category?: string;
}

interface LegislativeDetailDrawerProps {
    update: LegislativeUpdate | null;
    relatedNews: RelatedItem[];
    isOpen: boolean;
    onClose: () => void;
}

const IMPACT_META = {
    'Logistics Update': {
        icon: Truck,
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/50',
        description: 'This item affects local traffic patterns, transportation, or tour activity.',
    },
    'Property Intelligence': {
        icon: Building,
        className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50',
        description: 'This item may affect zoning, housing regulations, or property values.',
    },
};

export function LegislativeDetailDrawer({ update, relatedNews, isOpen, onClose }: LegislativeDetailDrawerProps) {
    if (!isOpen || !update) return null;

    const impactMeta = update.impact_label ? IMPACT_META[update.impact_label] : null;
    const ImpactIcon = impactMeta?.icon;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 z-40 transition-opacity"
                onClick={onClose}
            />
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-white/10">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-titanium-300 border-slate-200 dark:border-white/10">
                                {update.category}
                            </Badge>
                            <span className="text-xs text-slate-400 dark:text-titanium-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {update.date}
                            </span>
                        </div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                            {update.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Summary */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-titanium-400 uppercase tracking-wider mb-2">Summary</h3>
                        <p className="text-sm text-slate-700 dark:text-titanium-200 leading-relaxed">
                            {update.summary}
                        </p>
                    </div>

                    {/* Impact Classification */}
                    {impactMeta && ImpactIcon && (
                        <div className={`p-4 rounded-xl border ${impactMeta.className}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <ImpactIcon className="w-4 h-4" />
                                <span className="text-sm font-semibold">{update.impact_label}</span>
                            </div>
                            <p className="text-xs leading-relaxed opacity-80">
                                {impactMeta.description}
                            </p>
                        </div>
                    )}

                    {/* Source */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-titanium-400 uppercase tracking-wider mb-3">Source</h3>
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{update.source_name}</p>
                                <p className="text-xs text-slate-500 dark:text-titanium-400">cd4.lacity.gov</p>
                            </div>
                            <a
                                href={update.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                    Full Article
                                    <ExternalLink className="w-3 h-3" />
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Related Local News */}
                    {relatedNews.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-titanium-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Newspaper className="w-3 h-3" />
                                Related Coverage
                            </h3>
                            <div className="space-y-2">
                                {relatedNews.map(item => (
                                    <a
                                        key={item.id}
                                        href={item.href || '#'}
                                        target={item.href?.startsWith('http') ? '_blank' : undefined}
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 dark:text-titanium-500">
                                                {item.category && <span>{item.category}</span>}
                                                {item.date && <span>• {new Date(item.date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-titanium-600 flex-shrink-0 mt-0.5 group-hover:text-blue-500 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <p className="text-xs text-center text-slate-400 dark:text-titanium-600">
                        Source: cd4.lacity.gov • Councilmember Nithya Raman, District 4
                    </p>
                </div>
            </div>
        </>
    );
}
