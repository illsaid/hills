'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BriefingCardProps {
    title: string;
    subtitle: string;
    description?: string;
    icon: LucideIcon;
    status?: 'active' | 'normal' | 'warning' | 'critical';
    statusText?: string;
    updatedAt?: string;
    href?: string;
    layout?: 'standard' | 'highlight';
    children?: React.ReactNode;
    className?: string;
}

const STATUS_VARIANTS = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    normal: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse',
};

const ICON_VARIANTS = {
    active: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    normal: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50',
    warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
};

export function BriefingCard({
    title,
    subtitle,
    description,
    icon: Icon,
    status = 'normal',
    statusText,
    updatedAt,
    href,
    layout = 'standard',
    children,
    className
}: BriefingCardProps) {

    // If standard layout, simple card
    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-300",
            "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10",
            "hover:shadow-lg hover:border-slate-300 dark:hover:border-white/20",
            className
        )}>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                        <div className={cn("p-3 rounded-xl transition-colors", ICON_VARIANTS[status])}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-titanium-50 leading-tight mb-1">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-titanium-400">
                                {subtitle}
                            </p>
                        </div>
                    </div>

                    {statusText && (
                        <Badge variant="outline" className={cn("uppercase tracking-wider text-[10px] font-semibold", STATUS_VARIANTS[status])}>
                            {statusText}
                        </Badge>
                    )}
                </div>

                {/* Content */}
                {description && (
                    <p className="text-sm text-slate-600 dark:text-titanium-300 leading-relaxed mb-6">
                        {description}
                    </p>
                )}

                {children}

                {/* Footer / Action */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="text-xs text-slate-400 dark:text-titanium-500">
                        {updatedAt && `Updated ${updatedAt}`}
                    </div>

                    {href && (
                        <Link
                            href={href}
                            className="flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-titanium-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            View Details
                            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    );
}
