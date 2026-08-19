import React, { useState } from 'react';

const BAR_PALETTE = [
    '#EF4444', // Red (Domingo)
    '#3B82F6', // Blue (Lunes)
    '#10B981', // Emerald (Martes)
    '#F59E0B', // Amber (Miércoles)
    '#8B5CF6', // Purple (Jueves)
    '#EC4899', // Pink (Viernes)
    '#06B6D4'  // Cyan (Sábado)
];

const MonoBarChart = ({ data, onClick, barColor, horizontal = false }) => {
    const [hoveredIdx, setHoveredIdx] = useState(null);

    if (!data || !data.labels || !data.datasets || !data.datasets[0]) return null;

    const labels = data.labels;
    const dataset = data.datasets[0];
    const values = dataset.data || [];
    const datasetColors = dataset.backgroundColor;
    const maxVal = Math.max(...values, 1);
    const count = values.length;

    if (count === 0) return null;

    return (
        <div className="w-full h-full flex flex-col justify-between p-1 select-none">
            {/* Vertical Colorful Pill Bar Visualizer */}
            {!horizontal ? (
                <div className="w-full h-full flex-1 flex items-end justify-around gap-2.5 pt-2 pb-1 min-h-[260px]">
                    {values.map((val, idx) => {
                        const heightPct = Math.max((val / maxVal) * 100, 4);
                        const isHovered = hoveredIdx === idx;

                        const rawColor = Array.isArray(datasetColors)
                            ? datasetColors[idx]
                            : (typeof datasetColors === 'string' ? datasetColors : null);

                        const color = rawColor
                            || (typeof barColor === 'string' ? barColor : null)
                            || BAR_PALETTE[idx % BAR_PALETTE.length];

                        return (
                            <div
                                key={idx}
                                onMouseEnter={() => setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                onClick={(e) => onClick && onClick(e, [{ index: idx }])}
                                className="flex-1 flex flex-col items-center justify-end group cursor-pointer relative h-full"
                            >
                                {/* Tooltip Pill */}
                                {isHovered && (
                                    <div className="absolute bottom-full mb-2 bg-white text-gray-800 text-[10.5px] font-sans px-2.5 py-1 rounded-full shadow-md z-20 whitespace-nowrap border border-gray-200/80">
                                        <span className="font-bold">{val.toLocaleString()} llamadas</span>
                                    </div>
                                )}

                                {/* Outer Track with overflow-hidden (Flush fit bottom, no white gap) */}
                                <div className="w-full max-w-[38px] h-full min-h-[240px] bg-gray-100/90 rounded-full flex flex-col justify-end overflow-hidden border border-gray-200/60 shadow-2xs group-hover:border-gray-400 transition-colors">
                                    <div
                                        className="w-full rounded-t-full transition-all duration-500 ease-out"
                                        style={{
                                            height: `${heightPct}%`,
                                            backgroundColor: color,
                                            boxShadow: isHovered ? `0 0 16px ${color}aa` : 'none',
                                            transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)'
                                        }}
                                    ></div>
                                </div>

                                {/* Label */}
                                <span className={`text-[11px] font-bold mt-2 truncate w-full text-center transition-colors ${isHovered ? 'text-gray-900 font-extrabold' : 'text-gray-600'}`}>
                                    {labels[idx]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Horizontal Colorful Pill Bar Visualizer */
                <div className="w-full flex-1 flex flex-col justify-around gap-2.5 py-2 min-h-[240px]">
                    {values.map((val, idx) => {
                        const widthPct = Math.max((val / maxVal) * 100, 5);
                        const isHovered = hoveredIdx === idx;

                        const rawColor = Array.isArray(datasetColors)
                            ? datasetColors[idx]
                            : (typeof datasetColors === 'string' ? datasetColors : null);

                        const color = rawColor
                            || (typeof barColor === 'string' ? barColor : null)
                            || BAR_PALETTE[idx % BAR_PALETTE.length];

                        return (
                            <div
                                key={idx}
                                onMouseEnter={() => setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                onClick={(e) => onClick && onClick(e, [{ index: idx }])}
                                className="flex items-center gap-3 group cursor-pointer"
                            >
                                <span className={`w-28 text-[11px] font-bold truncate text-right shrink-0 transition-colors ${isHovered ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {labels[idx]}
                                </span>
                                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-100 flex items-center group-hover:border-gray-300">
                                    <div
                                        className="h-full rounded-r-full transition-all duration-500 ease-out"
                                        style={{
                                            width: `${widthPct}%`,
                                            backgroundColor: color,
                                            boxShadow: isHovered ? `0 0 10px ${color}66` : 'none'
                                        }}
                                    ></div>
                                </div>
                                <span className="w-12 text-[11px] font-mono font-bold text-gray-900 shrink-0">
                                    {val.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MonoBarChart;
