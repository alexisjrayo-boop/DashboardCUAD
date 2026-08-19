import React, { useState } from 'react';

const RANK_BADGES = [
    { text: '🥇 #1', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
    { text: '🥈 #2', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
    { text: '🥉 #3', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
];

const MonoRankList = ({ data, onClick }) => {
    const [hoveredIdx, setHoveredIdx] = useState(null);

    // Safely extract items array
    let items = [];
    if (Array.isArray(data)) {
        items = data;
    } else if (data?.datasets?.[0]?.tree) {
        items = data.datasets[0].tree;
    } else if (data?.tree) {
        items = data.tree;
    } else if (data?.datasets?.[0]?.data) {
        items = data.datasets[0].data;
    }

    if (!items || items.length === 0) {
        return (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-gray-400">
                <span className="text-2xl mb-2">📞</span>
                <span className="text-xs font-semibold">Sin datos de callers disponibles</span>
            </div>
        );
    }

    // Sort items by count descending
    const sorted = [...items].sort((a, b) => {
        const valA = typeof a === 'number' ? a : (a.value || a.val || a.v || 0);
        const valB = typeof b === 'number' ? b : (b.value || b.val || b.v || 0);
        return valB - valA;
    }).slice(0, 10);

    const maxVal = Math.max(...sorted.map(i => (typeof i === 'number' ? i : (i.value || i.val || i.v || 0))), 1);

    return (
        <div className="w-full h-full min-h-[220px] flex flex-col gap-2 p-1 select-none overflow-y-auto">
            {sorted.map((item, idx) => {
                const val = typeof item === 'number' ? item : (item.value || item.val || item.v || 0);
                const name = typeof item === 'object' ? (item.name || item.label || item.x || `Extension ${idx + 1}`) : `Item ${idx + 1}`;
                const ratio = (val / maxVal) * 100;
                const isHovered = hoveredIdx === idx;
                const badge = RANK_BADGES[idx] || { text: `#${idx + 1}`, bg: 'bg-gray-100 text-gray-600 border-gray-200' };

                return (
                    <div
                        key={idx}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={(e) => onClick && onClick(e, [{ index: idx }])}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${isHovered ? 'bg-blue-50/80 border-blue-200 shadow-sm scale-[1.01]' : 'bg-white border-gray-100 hover:bg-gray-50/80'}`}
                    >
                        {/* Rank Position Pill */}
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${badge.bg}`}>
                            {badge.text}
                        </span>

                        {/* Caller Info & Bar */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-bold truncate ${isHovered ? 'text-blue-900' : 'text-gray-800'}`}>
                                    {name}
                                </span>
                                <span className="text-[11px] font-mono font-extrabold text-gray-900 shrink-0">
                                    {val.toLocaleString()} <span className="text-[9px] font-normal text-gray-500">llamd.</span>
                                </span>
                            </div>

                            {/* Relative Progress Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(ratio, 4)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MonoRankList;
