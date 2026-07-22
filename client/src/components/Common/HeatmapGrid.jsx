import React from 'react';

// Temperature-based color mapping function
const getTemperatureColor = (intensity) => {
    // intensity ranges from 0 to 1
    if (intensity === 0) {
        return { r: 59, g: 130, b: 246 }; // Blue (nada)
    } else if (intensity <= 0.25) {
        // Blue to Green
        const t = intensity / 0.25;
        return {
            r: Math.round(59 + (34 - 59) * t),
            g: Math.round(130 + (197 - 130) * t),
            b: Math.round(246 + (94 - 246) * t)
        };
    } else if (intensity <= 0.5) {
        // Green to Yellow
        const t = (intensity - 0.25) / 0.25;
        return {
            r: Math.round(34 + (234 - 34) * t),
            g: Math.round(197 + (179 - 197) * t),
            b: Math.round(94 + (8 - 94) * t)
        };
    } else if (intensity <= 0.75) {
        // Yellow to Orange
        const t = (intensity - 0.5) / 0.25;
        return {
            r: Math.round(234 + (249 - 234) * t),
            g: Math.round(179 + (115 - 179) * t),
            b: Math.round(8 + (22 - 8) * t)
        };
    } else {
        // Orange to Red (more intense red)
        const t = (intensity - 0.75) / 0.25;
        return {
            r: Math.round(249 + (220 - 249) * t),
            g: Math.round(115 + (38 - 115) * t),
            b: Math.round(22 + (38 - 22) * t)
        };
    }
};

const HeatmapGrid = ({ data, title, colorBase = "255, 0, 0", valueLabel = "Llamadas" }) => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => d.value));

    // Find top 8 values
    const sortedValues = [...data].sort((a, b) => b.value - a.value);
    const top8Values = sortedValues.slice(0, 8).map(item => item.value);

    return (
        <div className="bg-white p-6 shadow-md border-t-4 border-nissan-red">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wide text-gray-800 border-b border-gray-100 pb-2">
                {title}
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                {data.map((item, index) => {
                    // Calculate intensity with exponential scale for better contrast
                    const normalizedValue = maxValue > 0 ? (item.value / maxValue) : 0;
                    // Use cubic scale to emphasize high values (power of 3)
                    const intensity = Math.pow(normalizedValue, 3);

                    // Get temperature-based color
                    const color = getTemperatureColor(intensity);

                    // Check if this is in top 8
                    const isTop8 = item.value > 0 && top8Values.includes(item.value);

                    return (
                        <div
                            key={index}
                            className="flex flex-col items-center justify-center p-2 rounded-sm transition-all hover:scale-105 hover:shadow-lg tooltip-container relative group cursor-default"
                            style={{
                                backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                                color: intensity > 0.5 ? 'white' : 'black'
                            }}
                        >
                            <span className="text-xs font-bold">{item.label}</span>
                            <span className="text-[10px] opacity-90 flex items-center gap-1">
                                {item.value}
                                {isTop8 && <span className="text-base" style={{ textShadow: '0 0 3px white, 0 0 5px white' }}>🔥</span>}
                            </span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap shadow-xl">
                                {item.fullLabel || item.label}: {item.value} {valueLabel}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HeatmapGrid;
