import React, { useState } from 'react';

const MonoDonutChart = ({ data, onClick }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    if (!data || !data.labels || !data.datasets || !data.datasets[0]) return null;

    const dataset = data.datasets[0];
    const labels = data.labels;
    const values = dataset.data || [];
    const total = values.reduce((acc, curr) => acc + curr, 0);

    const colors = dataset.backgroundColor || [
        '#10B981', '#EF4444', '#F59E0B', '#64748B', '#8B5CF6'
    ];

    const radius = 58;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    const count = values.filter(v => v > 0).length;

    // Increased gap between arcs to 24px for distinct Soft Arc Caps spacing
    const GAP_PX = count > 1 ? 24 : 0;
    const totalGaps = count * GAP_PX;
    const availableCircumference = Math.max(circumference - totalGaps, 0);

    let currentOffset = 0;

    const slices = values.map((val, idx) => {
        if (val <= 0) {
            return { label: labels[idx], value: 0, percentage: '0.0', color: colors[idx % colors.length], idx, isZero: true };
        }

        const percentageRatio = total > 0 ? (val / total) : 0;
        const sliceArcLength = Math.max(percentageRatio * availableCircumference, 2);

        const strokeDasharray = `${sliceArcLength} ${circumference - sliceArcLength}`;
        const strokeDashoffset = -currentOffset;

        currentOffset += sliceArcLength + GAP_PX;

        return {
            label: labels[idx] || `Item ${idx}`,
            value: val,
            percentage: (percentageRatio * 100).toFixed(1),
            color: colors[idx % colors.length],
            strokeDasharray,
            strokeDashoffset,
            idx,
            isZero: false
        };
    });

    const activeSlice = hoveredIndex !== null ? slices.find(s => s.idx === hoveredIndex) : null;

    return (
        <div className="w-full h-full flex flex-col md:flex-row items-center justify-around gap-4 p-2 select-none">
            {/* SVG Arc Donut Visualizer with Distinct Soft Arc Caps & Wide Gaps */}
            <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 160 160">
                    {/* Track Background Ring */}
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        className="stroke-gray-100/80"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />

                    {/* Arc Segments */}
                    {slices.map((slice) => {
                        if (slice.isZero) return null;
                        const isHovered = hoveredIndex === slice.idx;

                        return (
                            <circle
                                key={slice.idx}
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                                strokeDasharray={slice.strokeDasharray}
                                strokeDashoffset={slice.strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-300 cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(slice.idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={(e) => onClick && onClick(e, [{ index: slice.idx }])}
                                style={{
                                    opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                                    transformOrigin: 'center'
                                }}
                            />
                        );
                    })}
                </svg>

                {/* Center Total Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total</span>
                    <span className="text-xl font-extrabold text-gray-900 tracking-tight">
                        {activeSlice ? activeSlice.value.toLocaleString() : total.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">
                        {activeSlice ? `${activeSlice.percentage}%` : '100%'}
                    </span>
                </div>
            </div>

            {/* Mono Pill Legends */}
            <div className="flex flex-col gap-2 w-full max-w-[210px]">
                {slices.map((slice) => (
                    <div
                        key={slice.idx}
                        onMouseEnter={() => setHoveredIndex(slice.idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={(e) => onClick && onClick(e, [{ index: slice.idx }])}
                        className={`mono-pill flex items-center justify-between px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50/70 hover:bg-white hover:shadow-sm cursor-pointer transition-all ${hoveredIndex === slice.idx ? 'ring-2 ring-gray-300 scale-[1.02] bg-white shadow-xs' : ''}`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }}></span>
                            <span className="text-xs font-semibold text-gray-700 truncate">{slice.label}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-gray-900 ml-2">{slice.value.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MonoDonutChart;
