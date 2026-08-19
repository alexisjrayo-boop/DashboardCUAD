import React, { useState } from 'react';

const PALETTE = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#EF4444', // Red
    '#6366F1'  // Indigo
];

const MonoSplineChart = ({ data, onClick, fillArea = false, strokeColor }) => {
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [hiddenSeries, setHiddenSeries] = useState({});

    if (!data || !data.labels || !data.datasets || data.datasets.length === 0) return null;

    const labels = data.labels;
    const datasets = data.datasets;
    const count = labels.length;

    if (count === 0) return null;

    const visibleDatasets = datasets.filter((_, idx) => !hiddenSeries[idx]);

    let globalMax = 1;
    visibleDatasets.forEach(ds => {
        const dsMax = Math.max(...(ds.data || []), 0);
        if (dsMax > globalMax) globalMax = dsMax;
    });

    const viewBoxWidth = 1000;
    const viewBoxHeight = 180;
    const paddingX = 40;
    const paddingTop = 20;
    const paddingBottom = 15;

    const getControlPoint = (current, previous, next, reverse) => {
        const p = previous || current;
        const n = next || current;
        const smoothing = 0.15;
        const lengthX = n.x - p.x;
        const lengthY = n.y - p.y;
        const angle = Math.atan2(lengthY, lengthX) + (reverse ? Math.PI : 0);
        const length = Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)) * smoothing;
        const x = current.x + Math.cos(angle) * length;
        const y = current.y + Math.sin(angle) * length;
        return { x, y };
    };

    const seriesData = datasets.map((ds, sIdx) => {
        const isHidden = hiddenSeries[sIdx];
        const color = ds.borderColor || strokeColor || PALETTE[sIdx % PALETTE.length];
        const values = ds.data || [];

        const points = values.map((val, idx) => {
            const x = paddingX + (idx / Math.max(count - 1, 1)) * (viewBoxWidth - 2 * paddingX);
            const y = viewBoxHeight - paddingBottom - (val / globalMax) * (viewBoxHeight - paddingTop - paddingBottom);
            return { x, y, val, label: labels[idx], idx, seriesLabel: ds.label || `Línea ${sIdx + 1}`, color };
        });

        if (points.length === 0 || isHidden) {
            return { label: ds.label || `Línea ${sIdx + 1}`, color, isHidden, path: '', areaPath: '', points: [] };
        }

        let d = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const cp1 = getControlPoint(points[i], points[i - 1], points[i + 1], false);
            const cp2 = getControlPoint(points[i + 1], points[i], points[i + 2], true);
            d += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${points[i + 1].x},${points[i + 1].y}`;
        }

        const areaD = `${d} L ${points[points.length - 1].x},${viewBoxHeight - paddingBottom} L ${points[0].x},${viewBoxHeight - paddingBottom} Z`;

        return {
            label: ds.label || `Línea ${sIdx + 1}`,
            color,
            isHidden,
            path: d,
            areaPath: areaD,
            points
        };
    });

    const toggleSeries = (sIdx) => {
        setHiddenSeries(prev => ({ ...prev, [sIdx]: !prev[sIdx] }));
    };

    const firstVisiblePoints = seriesData.find(s => !s.isHidden)?.points || [];
    const activeX = hoveredIdx !== null && firstVisiblePoints[hoveredIdx] ? firstVisiblePoints[hoveredIdx].x : null;

    const step = count <= 12 ? 1 : Math.ceil(count / 10);
    const visibleLabelIndices = labels.map((_, idx) => idx).filter(idx => idx % step === 0 || idx === count - 1);

    return (
        <div className="w-full h-full flex flex-col justify-between relative select-none">
            {/* Legend Pills */}
            {datasets.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap mb-2 px-1">
                    {seriesData.map((s, sIdx) => (
                        <button
                            key={sIdx}
                            onClick={() => toggleSeries(sIdx)}
                            className={`mono-pill flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${s.isHidden ? 'bg-gray-50 border-gray-200 text-gray-400 line-through opacity-60' : 'bg-white border-gray-200 text-gray-800 shadow-2xs'}`}
                        >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                            <span>{s.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* SVG Canvas for Lines, Grid & Scrubber */}
            <div className="relative w-full flex-1 min-h-[180px]">
                <svg
                    className="w-full h-full overflow-visible"
                    viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                    preserveAspectRatio="none"
                >
                    <defs>
                        {seriesData.map((s, sIdx) => (
                            <linearGradient key={sIdx} id={`monoGradient-${sIdx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={s.color} stopOpacity="0.10" />
                                <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = viewBoxHeight - paddingBottom - ratio * (viewBoxHeight - paddingTop - paddingBottom);
                        return (
                            <line
                                key={i}
                                x1={paddingX}
                                y1={y}
                                x2={viewBoxWidth - paddingX}
                                y2={y}
                                stroke="#F1F5F9"
                                strokeDasharray="4 4"
                                strokeWidth="1.5"
                            />
                        );
                    })}

                    {/* Area Tint */}
                    {fillArea && seriesData.map((s, sIdx) => {
                        if (s.isHidden || !s.areaPath) return null;
                        return (
                            <path
                                key={`area-${sIdx}`}
                                d={s.areaPath}
                                fill={`url(#monoGradient-${sIdx})`}
                            />
                        );
                    })}

                    {/* Spline Lines */}
                    {seriesData.map((s, sIdx) => {
                        if (s.isHidden || !s.path) return null;
                        return (
                            <path
                                key={`line-${sIdx}`}
                                d={s.path}
                                fill="transparent"
                                stroke={s.color}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        );
                    })}

                    {/* Scrubber vertical line */}
                    {activeX !== null && (
                        <line
                            x1={activeX}
                            y1={paddingTop}
                            x2={activeX}
                            y2={viewBoxHeight - paddingBottom}
                            stroke="#94A3B8"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                        />
                    )}
                </svg>

                {/* Crisp Native HTML Points (Filled center of line color with crisp white border) */}
                {seriesData.map((s, sIdx) => {
                    if (s.isHidden) return null;
                    return s.points.map((pt) => {
                        const isHovered = hoveredIdx === pt.idx;
                        const leftPct = (pt.x / viewBoxWidth) * 100;
                        const topPct = (pt.y / viewBoxHeight) * 100;

                        return (
                            <div
                                key={`${sIdx}-${pt.idx}`}
                                style={{
                                    left: `${leftPct}%`,
                                    top: `${topPct}%`,
                                    backgroundColor: s.color,
                                    borderColor: '#ffffff'
                                }}
                                className={`absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer shadow-xs ${isHovered ? 'w-3.5 h-3.5 ring-2 ring-blue-400 scale-125 z-20' : 'w-2.5 h-2.5 z-10 opacity-95'}`}
                                onMouseEnter={() => setHoveredIdx(pt.idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                onClick={(e) => onClick && onClick(e, [{ datasetIndex: sIdx, index: pt.idx }])}
                            />
                        );
                    });
                })}

                {/* Scrubber Tooltip */}
                {hoveredIdx !== null && firstVisiblePoints[hoveredIdx] && (
                    <div
                        className="absolute pointer-events-none z-30 bg-white/95 text-gray-800 text-[10.5px] font-sans px-3 py-1.5 rounded-xl shadow-lg border border-gray-200/80 flex flex-col gap-1.5 transform -translate-x-1/2 -translate-y-full mb-2"
                        style={{
                            left: `${(activeX / viewBoxWidth) * 100}%`,
                            top: `10%`
                        }}
                    >
                        <span className="font-bold text-nissan-red border-b border-gray-100 pb-0.5 text-center">
                            {labels[hoveredIdx]}
                        </span>
                        <div className="flex flex-col gap-1 pt-0.5">
                            {seriesData.map((s, sIdx) => {
                                if (s.isHidden || !s.points[hoveredIdx]) return null;
                                const pt = s.points[hoveredIdx];
                                return (
                                    <div key={sIdx} className="flex items-center justify-between gap-4 text-[10.5px]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                                            <span className="text-gray-600 font-semibold">{s.label}</span>
                                        </div>
                                        <span className="font-mono font-bold text-gray-900 ml-2">{pt.val.toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Crisp Native HTML X-Axis Labels */}
            <div className="relative w-full h-6 pt-1 border-t border-gray-100 mt-1">
                {firstVisiblePoints.length > 0 && visibleLabelIndices.map((lblIdx) => {
                    const pt = firstVisiblePoints[lblIdx];
                    if (!pt) return null;
                    const leftPct = (pt.x / viewBoxWidth) * 100;
                    const isHovered = hoveredIdx === lblIdx;

                    return (
                        <span
                            key={lblIdx}
                            style={{ left: `${leftPct}%` }}
                            onMouseEnter={() => setHoveredIdx(lblIdx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            className={`absolute transform -translate-x-1/2 text-[10px] font-sans transition-colors cursor-pointer select-none whitespace-nowrap ${isHovered ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}
                        >
                            {labels[lblIdx]}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default MonoSplineChart;
