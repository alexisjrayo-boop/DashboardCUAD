import React, { useState, useEffect } from 'react';

// Temperature-based color mapping function
const getTemperatureColor = (intensity) => {
    // intensity ranges from 0 to 1
    if (intensity === 0) return { r: 59, g: 130, b: 246 }; // Vibrant Blue

    if (intensity <= 0.4) {
        // Stage 1: Extended Blue -> Green (0% to 40%)
        // We keep Blue strong until ~30% and Red very low
        const t = intensity / 0.4;
        return {
            r: Math.round(59 + (130 - 59) * Math.pow(t, 6)), // Red stays low much longer
            g: Math.round(130 + (255 - 130) * Math.pow(t, 1.2)), // Green rises
            b: Math.round(246 * Math.pow(1 - t, 0.3)) // Blue stays high longer (more presence until 30%)
        };
    } else if (intensity <= 0.7) {
        // Stage 2: Greenish -> Full Yellow (40% to 70%)
        const t = (intensity - 0.4) / 0.3;
        return {
            r: Math.round(130 + (255 - 130) * t), // Red catches up for Yellow
            g: Math.round(255 + (235 - 255) * t),
            b: 0
        };
    } else {
        // Stage 3: Yellow -> Intense Red (70% to 100%)
        const t = (intensity - 0.7) / 0.3;
        return {
            r: Math.round(255 + (195 - 255) * t),
            g: Math.round(235 * (1 - Math.pow(t, 0.6))),
            b: Math.round(47 * t)
        };
    }
};

const HeatmapMatrix = ({ data, title, xLabels, colorBase = "195, 0, 47", valueLabel = "llamadas", onCellClick, className = "" }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!data || data.length === 0) return null;

    // Filter range for mobile: 8:00 (index 8) to 20:00 (index 20)
    const startIndex = isMobile ? 8 : 0;
    const endIndex = isMobile ? 20 : 23;

    const filteredXLabels = xLabels.slice(startIndex, endIndex + 1);
    const filteredData = data.map(row => ({
        ...row,
        values: row.values.slice(startIndex, endIndex + 1)
    }));

    // Find global max for consistent scaling across the entire matrix
    let maxValue = 0;
    filteredData.forEach(row => {
        row.values.forEach(v => {
            if (v > maxValue) maxValue = v;
        });
    });

    // Calculate 90% threshold for fire emoji
    const threshold90 = maxValue * 0.80;

    return (
        <div className={`bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden flex flex-col h-full ${className}`}>
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                <span className="w-2 h-6 bg-pink-500 rounded-full"></span>
                {title}
            </h3>

            <div className="w-full flex-1 flex flex-col justify-center">
                {/* X-Axis Labels (Hours) */}
                <div className="flex mb-3">
                    <div className="w-12 md:w-16 shrink-0"></div>
                    <div className="flex flex-1 justify-between px-1">
                        {filteredXLabels.map((label, i) => (
                            <div key={i} className={`text-[10px] text-gray-400 font-semibold w-full text-center tracking-tighter opacity-70 ${isMobile && i % 2 !== 0 ? 'hidden' : ''}`}>
                                {label.split(':')[0]}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Matrix Content */}
                <div className="relative">
                    {/* Rows */}
                    <div className="space-y-1">
                        {filteredData.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex items-center group/row">
                                {/* Y-Axis Label */}
                                <div className="w-12 md:w-16 shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate text-right pr-2 md:pr-4 group-hover/row:text-gray-600 transition-colors">
                                    {row.label}
                                </div>

                                {/* Row Values (Grid Cells) */}
                                <div className="flex flex-1 justify-between gap-1">
                                    {(() => {
                                        const maxInRow = Math.max(...row.values);
                                        const firstMaxIndex = row.values.indexOf(maxInRow);
                                        const globalThreshold = maxValue * 0.8;

                                        return row.values.map((val, colIndex) => {
                                            const ratio = maxValue > 0 ? (val / maxValue) : 0;
                                            const weighted = Math.pow(ratio, 0.4);
                                            const color = getTemperatureColor(weighted);
                                            const isHot = colIndex === firstMaxIndex && val >= globalThreshold && val > 0;

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
                                                    className={`h-9 w-full rounded-[4px] relative group transition-all duration-300 hover:scale-[1.25] hover:z-10 flex items-center justify-center ${onCellClick ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-orange-400 focus:ring-2 focus:ring-offset-1 focus:ring-orange-400 focus:z-10 outline-none shadow-sm' : 'cursor-default'}`}
                                                    style={{
                                                        backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`
                                                    }}
                                                >
                                                    {/* Fire emoji for high values - only peak of the day */}
                                                    {isHot && (
                                                        <span className="hidden md:inline text-[10px] drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">🔥</span>
                                                    )}

                                                    {/* Tooltip */}
                                                    {val > 0 && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus:block bg-gray-900/95 backdrop-blur-sm text-white text-[10px] rounded-md py-1.5 px-3 z-20 whitespace-nowrap shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-1 duration-200" aria-hidden="true">
                                                            <span className="font-bold text-orange-300">{row.label}</span>
                                                            <span className="mx-1 opacity-50">•</span>
                                                            <span>{filteredXLabels[colIndex]}</span>
                                                            <span className="mx-1 opacity-50">•</span>
                                                            <span className="font-bold">{val} {valueLabel}</span>
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
