'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Building2, ShieldAlert, MapPin, Landmark, Newspaper, X, Loader as Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

interface SearchResult {
    id: string;
    type: 'permit' | 'business' | 'safety' | 'code' | 'news' | 'legislative';
    title: string;
    subtitle?: string;
    href?: string;
    date?: string;
}

const TYPE_META: Record<SearchResult['type'], { icon: React.ElementType; label: string; color: string }> = {
    permit: { icon: FileText, label: 'Permit', color: 'text-blue-600 bg-blue-50' },
    business: { icon: Building2, label: 'Business', color: 'text-emerald-600 bg-emerald-50' },
    safety: { icon: ShieldAlert, label: 'Safety', color: 'text-red-600 bg-red-50' },
    code: { icon: MapPin, label: 'Code Case', color: 'text-amber-600 bg-amber-50' },
    news: { icon: Newspaper, label: 'News', color: 'text-stone-600 bg-stone-100' },
    legislative: { icon: Landmark, label: 'Legislative', color: 'text-teal-600 bg-teal-50' },
};

async function runSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    const [permitsRes, codeRes, safetyRes, newsRes] = await Promise.allSettled([
        supabaseBrowser
            .from('recent_permits')
            .select('permit_number, address, permit_type, status, issue_date, description')
            .or(`address.ilike.%${q}%,description.ilike.%${q}%,permit_type.ilike.%${q}%`)
            .order('issue_date', { ascending: false })
            .limit(5),
        supabaseBrowser
            .from('code_enforcement')
            .select('case_number, address, case_type, date_opened, status')
            .or(`address.ilike.%${q}%,case_type.ilike.%${q}%,case_number.ilike.%${q}%`)
            .eq('status', 'O')
            .order('date_opened', { ascending: false })
            .limit(4),
        supabaseBrowser
            .from('neighborhood_intel')
            .select('id, title, description, published_at, source_url, category')
            .eq('category', 'Safety')
            .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
            .order('published_at', { ascending: false })
            .limit(4),
        supabaseBrowser
            .from('neighborhood_intel')
            .select('id, title, description, published_at, source_url, category')
            .not('category', 'eq', 'Safety')
            .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
            .order('published_at', { ascending: false })
            .limit(4),
    ]);

    if (permitsRes.status === 'fulfilled' && permitsRes.value.data) {
        for (const p of permitsRes.value.data) {
            results.push({
                id: `permit-${p.permit_number}`,
                type: 'permit',
                title: p.address || p.permit_number,
                subtitle: `${p.permit_type} • ${p.status}`,
                href: '/permits',
                date: p.issue_date,
            });
        }
    }

    if (codeRes.status === 'fulfilled' && codeRes.value.data) {
        for (const c of codeRes.value.data) {
            results.push({
                id: `code-${c.case_number}`,
                type: 'code',
                title: c.address || c.case_number,
                subtitle: `${c.case_type || 'Code Violation'} • Case ${c.case_number}`,
                href: '/safety',
                date: c.date_opened,
            });
        }
    }

    if (safetyRes.status === 'fulfilled' && safetyRes.value.data) {
        for (const s of safetyRes.value.data) {
            results.push({
                id: `safety-${s.id}`,
                type: 'safety',
                title: s.title || 'Safety Alert',
                subtitle: s.description?.slice(0, 80) || '',
                href: s.source_url || '/safety',
                date: s.published_at,
            });
        }
    }

    if (newsRes.status === 'fulfilled' && newsRes.value.data) {
        for (const n of newsRes.value.data) {
            const isLeg = n.category === 'Government' || n.category === 'Legislation';
            results.push({
                id: `news-${n.id}`,
                type: isLeg ? 'legislative' : 'news',
                title: n.title || 'Update',
                subtitle: n.description?.slice(0, 80) || '',
                href: n.source_url || (isLeg ? '/council' : '/'),
                date: n.published_at,
            });
        }
    }

    return results.slice(0, 12);
}

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const search = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const r = await runSearch(q);
        setResults(r);
        setSelectedIndex(0);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(query), 280);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, search]);

    const handleSelect = useCallback((result: SearchResult) => {
        onClose();
        if (result.href?.startsWith('http')) {
            window.open(result.href, '_blank', 'noopener');
        } else if (result.href) {
            router.push(result.href);
        }
    }, [onClose, router]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, results.length - 1));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter' && results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, results, selectedIndex, handleSelect, onClose]);

    if (!isOpen) return null;

    const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        const label = TYPE_META[r.type].label;
        if (!acc[label]) acc[label] = [];
        acc[label].push(r);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
                    <Search className="w-5 h-5 text-stone-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search permits, businesses, safety alerts, news..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 text-sm text-stone-900 placeholder:text-stone-400 bg-transparent outline-none"
                    />
                    {loading && <Loader2 className="w-4 h-4 text-stone-400 animate-spin flex-shrink-0" />}
                    {!loading && query && (
                        <button onClick={() => setQuery('')} className="p-1 hover:bg-stone-100 rounded-full">
                            <X className="w-4 h-4 text-stone-400" />
                        </button>
                    )}
                    <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-stone-400 border border-stone-200 rounded">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                {query.trim().length >= 2 && (
                    <div className="max-h-[420px] overflow-y-auto">
                        {results.length === 0 && !loading ? (
                            <div className="py-10 text-center">
                                <p className="text-sm text-stone-400">No results for &ldquo;{query}&rdquo;</p>
                            </div>
                        ) : (
                            <div className="py-2">
                                {Object.entries(grouped).map(([label, items]) => (
                                    <div key={label}>
                                        <div className="px-4 py-1.5">
                                            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{label}</span>
                                        </div>
                                        {items.map((r) => {
                                            const meta = TYPE_META[r.type];
                                            const Icon = meta.icon;
                                            const flatIndex = results.indexOf(r);
                                            return (
                                                <button
                                                    key={r.id}
                                                    onClick={() => handleSelect(r)}
                                                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${flatIndex === selectedIndex ? 'bg-stone-50' : 'hover:bg-stone-50'}`}
                                                >
                                                    <span className={`flex-shrink-0 p-1.5 rounded-lg text-xs font-medium ${meta.color}`}>
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-stone-900 truncate">{r.title}</p>
                                                        {r.subtitle && (
                                                            <p className="text-xs text-stone-500 truncate">{r.subtitle}</p>
                                                        )}
                                                    </div>
                                                    {r.date && (
                                                        <span className="flex-shrink-0 text-xs text-stone-400">
                                                            {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                    <ArrowRight className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty state hint */}
                {query.trim().length < 2 && (
                    <div className="py-8 px-6 text-center space-y-4">
                        <p className="text-sm text-stone-400">Search across permits, businesses, safety, and news</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {['permits', 'code violation', 'fire', 'restaurant', 'construction'].map(hint => (
                                <button
                                    key={hint}
                                    onClick={() => setQuery(hint)}
                                    className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors"
                                >
                                    {hint}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-stone-400">
                        <span className="flex items-center gap-1"><kbd className="border border-stone-200 rounded px-1">↑↓</kbd> navigate</span>
                        <span className="flex items-center gap-1"><kbd className="border border-stone-200 rounded px-1">↵</kbd> select</span>
                    </div>
                    <span className="text-xs text-stone-400">{results.length} results</span>
                </div>
            </div>
        </div>
    );
}
