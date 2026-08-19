import React, { useState, useEffect } from 'react';

// Light theme contribution activity matrix color mapping
const getMonoContributionColor = (intensity) => {
    if (intensity === 0) return '#F8FAFC'; // slate-50 (empty)
    if (intensity <= 0.25) return '#D1FAE5'; // emerald-100
    if (intensity <= 0.50) return '#6EE7B7'; // emerald-300
    if (intensity <= 0.75) return '#10B981'; // emerald-500
    return '#047857'; // emerald-700
};

const HeatmapMatrix = ({ data, title, xLabels, valueLabel = "llamadas", onCellClick, className = "" }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!data || data.length === 0) return null;

    const startIndex = isMobile ? 8 : 0;
    const endIndex = isMobile ? 20 : 23;

    const filteredXLabels = xLabels.slice(startIndex, endIndex + 1);
    const filteredData = data.map(row => ({
        ...row,
        values: row.values.slice(startIndex, endIndex + 1)
    }));

    let maxValue = 0;
    filteredData.forEach(row => {
        row.values.forEach(v => {
            if (v > maxValue) maxValue = v;
        });
    });

    return (
        <div className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_10px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden flex flex-col h-full ${className}`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {title}
                </h3>
                <span className="mono-pill text-[10px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                    Matriz de Actividad
                </span>
            </div>

            <div className="w-full flex-1 flex flex-col justify-center">
                {/* X-Axis Labels (Hours) */}
                <div className="flex mb-2">
                    <div className="w-12 md:w-16 shrink-0"></div>
                    <div className="flex flex-1 justify-between px-1">
                        {filteredXLabels.map((label, i) => (
                            <div key={i} className={`text-[10px] text-gray-400 font-bold w-full text-center tracking-tight ${isMobile && i % 2 !== 0 ? 'hidden' : ''}`}>
                                {label.split(':')[0]}h
                            </div>
                        ))}
                    </div>
                </div>

                {/* Matrix Content */}
                <div className="relative">
                    <div className="space-y-1.5">
                        {filteredData.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex items-center group/row">
                                <div className="w-12 md:w-16 shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate text-right pr-2 md:pr-4 group-hover/row:text-gray-900 transition-colors">
                                    {row.label}
                                </div>

                                <div className="flex flex-1 justify-between gap-1.5">
                                    {(() => {
                                        const maxInRow = Math.max(...row.values);
                                        const firstMaxIndex = row.values.indexOf(maxInRow);
                                        const globalThreshold = maxValue * 0.8;

                                        return row.values.map((val, colIndex) => {
                                            const ratio = maxValue > 0 ? (val / maxValue) : 0;
                                            const bgColor = getMonoContributionColor(ratio);
                                            const isHot = colIndex === firstMaxIndex && val >= globalThreshold && val > 0;
                                            const isHigh = ratio > 0.6;

                                            return (
                                                <div
                                                    key={colIndex}
                                                    onClick={() => onCellClick && onCellClick(row.label, filteredXLabels[colIndex], val)}
                                                    onKeyDown={(e) => {
                                                        if (onCellClick && (e.key === 'Enter' || e.key === ' ')) {
                                                            e.preventDefault();
                                                            onCellClick(row.label, filteredXLabels[colIndex], val);
                                                        }
                                                    }}
                                                    tabIndex={onCellClick ? "0" : undefined}
                                                    role={onCellClick ? "button" : undefined}
                                                    aria-label={`${val} ${valueLabel} el ${row.label} a las ${filteredXLabels[colIndex]}`}
                                                    className={`h-8 w-full rounded-md relative group transition-all duration-200 hover:scale-125 hover:z-20 flex items-center justify-center border border-gray-100 ${onCellClick ? 'cursor-pointer hover:border-emerald-500 hover:shadow-md focus:ring-2 focus:ring-emerald-500 outline-none' : 'cursor-default'}`}
                                                    style={{ backgroundColor: bgColor }}
                                                >
                                                    {isHot && (
                                                        <span className="hidden md:inline text-[10px] drop-shadow-xs">🔥</span>
                                                    )}

                                                    {/* Tooltip */}
                                                    {val > 0 && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus:flex items-center gap-1.5 bg-gray-900 text-white text-[10px] font-mono rounded-lg py-1.5 px-3 z-30 whitespace-nowrap shadow-xl border border-white/10 pointer-events-none">
                                                            <span className="font-bold text-emerald-400">{row.label}</span>
                                                            <span className="text-gray-600">•</span>
                                                            <span className="text-gray-300">{filteredXLabels[colIndex]}</span>
                                                            <span className="text-gray-600">•</span>
                                                            <span className="font-extrabold text-white">{val} {valueLabel}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeatmapMatrix;
