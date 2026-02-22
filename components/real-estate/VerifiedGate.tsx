'use client';

import { MapPin, AlertCircle } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';

interface VerifiedGateProps {
    children?: React.ReactNode;
    moduleName?: string;
}

export function VerifiedGate({ children, moduleName = 'this module' }: VerifiedGateProps) {
    const { verificationStatus, address } = useAddressContext();

    if (verificationStatus === 'verified') {
        return <>{children}</>;
    }

    if (verificationStatus === 'unverified') {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-5">
                    <AlertCircle className="w-7 h-7 text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Address outside service area
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    {moduleName} is available for addresses within the Hollywood Hills service area.
                </p>
                {address && (
                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
                        {address.address_text}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-5">
                <MapPin className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Add a Hills address
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                {moduleName} is available for properties within the Hollywood Hills service area. Add your address above to get started.
            </p>
        </div>
    );
}
