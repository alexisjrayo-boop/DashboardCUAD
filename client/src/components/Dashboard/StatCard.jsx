import { ArrowUp, ArrowDown, HelpCircle } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, trend, color = "blue", onClick, percentage, info }) => {
    const colorClasses = {
        nissan: "text-[#C3002F] bg-red-50 ring-red-100/80",
        blue: "text-blue-600 bg-blue-50 ring-blue-100/80",
        green: "text-emerald-600 bg-emerald-50 ring-emerald-100/80",
        purple: "text-purple-600 bg-purple-50 ring-purple-100/80",
        orange: "text-amber-600 bg-amber-50 ring-amber-100/80",
        red: "text-red-600 bg-red-50 ring-red-100/80",
        gray: "text-gray-600 bg-gray-50 ring-gray-100/80",
    };

    const barColors = {
        nissan: "bg-[#C3002F]",
        blue: "bg-blue-500",
        green: "bg-emerald-500",
        purple: "bg-purple-500",
        orange: "bg-amber-500",
        red: "bg-red-500",
        gray: "bg-gray-400",
    };

    const handleKeyDown = (e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
        }
    };

    const displayValue = typeof value === 'number' ? value.toLocaleString() : (value || '0');
    const getValueFontSize = (val) => {
        const str = String(val);
        if (str.length > 25) return 'text-xs';
        if (str.length > 20) return 'text-sm';
        if (str.length > 15) return 'text-base';
        if (str.length > 10) return 'text-lg';
        return 'text-xl sm:text-2xl';
    };

    return (
        <div
            onClick={onClick}
            onKeyDown={handleKeyDown}
            tabIndex={onClick ? "0" : undefined}
            role={onClick ? "button" : undefined}
            aria-label={onClick ? `Ver detalles de ${title}` : undefined}
            className={`relative bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.06)] transition-all duration-300 group hover:-translate-y-0.5 hover:z-50 focus-within:z-50 flex flex-col justify-between ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C3002F]/50' : ''}`}
        >
            {/* Top row: Icon on left, Title + Count on right */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Square Icon Container */}
                <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl ring-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${colorClasses[color] || colorClasses.blue}`}
                    aria-hidden="true"
                >
                    <Icon className="h-5 w-5 sm:h-5 sm:w-5" />
                </div>

                {/* Title & Count Column */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate" title={title}>
                            {title}
                        </h3>

                        {/* Top Right Tooltip / Trend */}
                        <div className="flex items-center gap-1 shrink-0">
                            {trend !== undefined && trend !== null && (
                                <span
                                    className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                                >
                                    {trend > 0 ? <ArrowUp className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDown className="h-2.5 w-2.5 mr-0.5" />}
                                    {Math.abs(trend)}%
                                </span>
                            )}
                            {info && (
                                <div className="relative group/info flex items-center">
                                    <button
                                        type="button"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        aria-label={`Información sobre ${title}`}
                                        className="p-0.5 rounded-full text-gray-300 hover:text-gray-600 transition-colors focus:outline-none cursor-help flex items-center justify-center"
                                    >
                                        <HelpCircle className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Tooltip Card */}
                                    <div className="absolute right-0 top-full mt-2 hidden group-hover/info:flex flex-col w-60 p-2.5 bg-gray-900/95 text-white text-[11px] font-medium rounded-xl shadow-2xl border border-white/10 backdrop-blur-xl z-[100] pointer-events-none transition-all duration-200">
                                        <div className="flex items-center gap-1.5 font-bold text-[10px] text-gray-300 uppercase tracking-wider mb-1 border-b border-white/10 pb-1">
                                            <HelpCircle className="h-3 w-3 text-sky-400 shrink-0" />
                                            <span className="truncate">{title}</span>
                                        </div>
                                        <p className="leading-relaxed text-gray-200 text-[10.5px]">
                                            {info}
                                        </p>
                                        <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900/95 rotate-45 border-l border-t border-white/10"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Count / Value */}
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <p
                            className={`${getValueFontSize(displayValue)} font-black text-gray-900 tracking-tight leading-none truncate`}
                            title={displayValue}
                        >
                            {displayValue}
                        </p>
                        {percentage !== undefined && (
                            <span className="text-[11px] font-bold text-gray-500 shrink-0">
                                ({percentage}%)
                            </span>
                        )}
                    </div>

                    {subtext && (
                        <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                            {subtext}
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="mt-2.5 w-full">
                <div
                    className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner"
                    role="progressbar"
                    aria-valuenow={percentage !== undefined ? percentage : 100}
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div
                        className={`h-full transition-all duration-1000 ease-out rounded-full ${barColors[color] || barColors.blue}`}
                        style={{ width: `${percentage !== undefined ? percentage : 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default StatCard;

