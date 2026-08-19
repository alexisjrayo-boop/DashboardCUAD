import React, { useState } from 'react';

const MonoTreemap = ({ data, onClick }) => {
    const [hoveredIdx, setHoveredIdx] = useState(null);

    // Safely extract items from any data structure variant
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
            <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center p-6 text-gray-400">
                <span className="text-2xl mb-2">📊</span>
                <span className="text-xs font-semibold">Sin datos de volumen disponibles</span>
            </div>
        );
    }

    const maxVal = Math.max(...items.map(i => (typeof i === 'number' ? i : (i.value || i.val || i.v || 0))), 1);

    const colors = [
        'bg-blue-50/90 border-blue-200 text-blue-900 hover:border-blue-400',
        'bg-indigo-50/90 border-indigo-200 text-indigo-900 hover:border-indigo-400',
        'bg-purple-50/90 border-purple-200 text-purple-900 hover:border-purple-400',
        'bg-teal-50/90 border-teal-200 text-teal-900 hover:border-teal-400',
        'bg-amber-50/90 border-amber-200 text-amber-900 hover:border-amber-400',
        'bg-emerald-50/90 border-emerald-200 text-emerald-900 hover:border-emerald-400'
    ];

    return (
        <div className="w-full h-full min-h-[220px] grid grid-cols-2 sm:grid-cols-3 gap-3 p-1 select-none">
            {items.map((item, idx) => {
                const val = typeof item === 'number' ? item : (item.value || item.val || item.v || 0);
                const name = typeof item === 'object' ? (item.name || item.label || item.x || `Caller ${idx + 1}`) : `Item ${idx + 1}`;
                const ratio = val / maxVal;
                const isHovered = hoveredIdx === idx;
                const colorClass = colors[idx % colors.length];

                return (
                    <div
                        key={idx}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={(e) => onClick && onClick(e, [{ index: idx }])}
                        className={`mono-pill relative rounded-xl p-3.5 border flex flex-col justify-between transition-all duration-300 cursor-pointer ${colorClass} ${isHovered ? 'scale-[1.03] shadow-md ring-2 ring-blue-400/50 z-10' : 'hover:scale-[1.01]'}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-extrabold truncate tracking-tight text-gray-900" title={name}>
                                {name}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-2xs shrink-0">
                                {val.toLocaleString()}
                            </span>
                        </div>

                        {/* Volume bar indicator */}
                        <div className="mt-3 w-full bg-gray-200/60 rounded-full h-2 overflow-hidden p-0.5">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(ratio * 100, 6)}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MonoTreemap;
