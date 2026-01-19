import { Twitter, AlertTriangle, Clock, ExternalLink } from 'lucide-react';

interface SocialPulseCardProps {
    post: {
        author: string;
        content: string;
        time_ago: string;
        priority?: string;
        url?: string;
    };
}

export default function SocialPulseCard({ post }: SocialPulseCardProps) {
    // Logic to highlight our key zips in the text
    const highlightKeywords = (text: string) => {
        if (!text) return null;
        const keywords = [
            '90068', '90046', '90069', 'Hollywood Hills',
            'Beachwood Canyon', 'Laurel Canyon', 'Runyon Canyon',
            'Sunset Plaza', 'Bird Streets', 'Hollywood Dell', 'Outpost Estates'
        ];

        // Simple split/map approach to avoid dangerouslySetInnerHTML for safety if possible, 
        // but user asked for `**word**` replacement or bolding. 
        // Let's use a regex to wrap matches in <strong> tags and render safely or just render arrays.
        // For simplicity/speed matching user snippet request (which returned string), 
        // I will assume they want visual bolding.

        const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'));

        return (
            <span>
                {parts.map((part, i) =>
                    keywords.some(k => k.toLowerCase() === part.toLowerCase()) ?
                        <strong key={i} className="text-slate-900 dark:text-white font-bold">{part}</strong> :
                        part
                )}
            </span>
        );
    };

    return (
        <div className={`p-4 border-l-4 rounded-r-lg mb-4 ${post.priority === 'High' ? 'border-red-600 bg-red-50 dark:bg-red-900/10' : 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'}`}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Twitter size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">@{post.author}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock size={10} />
                    <span>{post.time_ago}</span>
                    {post.url && (
                        <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 hover:text-blue-500 transition-colors"
                            aria-label="View on X"
                        >
                            <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                {highlightKeywords(post.content)}
            </p>
            {post.priority === 'High' && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
                    <AlertTriangle size={10} />
                    Potential Emergency
                </div>
            )}
        </div>
    );
}
