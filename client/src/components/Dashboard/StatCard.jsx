import { ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, trend, color = "blue", onClick, percentage }) => {
    const colorClasses = {
        nissan: "text-nissan-red bg-red-50 ring-red-100",
        blue: "text-blue-600 bg-blue-50 ring-blue-100",
        green: "text-green-600 bg-green-50 ring-green-100",
        purple: "text-purple-600 bg-purple-50 ring-purple-100",
        orange: "text-orange-600 bg-orange-50 ring-orange-100",
        red: "text-red-600 bg-red-50 ring-red-100",
        gray: "text-gray-600 bg-gray-50 ring-gray-100",
    };

    const barColors = {
        nissan: "bg-nissan-red",
        blue: "bg-blue-500",
        green: "bg-green-500",
        purple: "bg-purple-500",
        orange: "bg-orange-500",
        red: "bg-red-500",
        gray: "bg-gray-400",
    };

    const handleKeyDown = (e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
        }
    };

    const displayValue = typeof value === 'number' ? value.toLocaleString() : (value || '');
    const getValueFontSize = (val) => {
        const str = String(val);
        if (str.length > 25) return 'text-sm';
        if (str.length > 20) return 'text-base';
        if (str.length > 17) return 'text-lg';
        if (str.length > 14) return 'text-xl';
        if (str.length > 10) return 'text-2xl';
        return 'text-3xl';
    };

    return (
        <div
            onClick={onClick}
            onKeyDown={handleKeyDown}
            tabIndex={onClick ? "0" : undefined}
            role={onClick ? "button" : undefined}
            aria-label={onClick ? `Ver detalles de ${title}` : undefined}
            className={`group relative bg-white rounded-xl p-5 border border-gray-100 hover:border-nissan-red/30 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-nissan-red/50' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className={`p-2.5 rounded-lg ring-4 transition-transform duration-500 group-hover:scale-110 ${colorClasses[color] || colorClasses.blue}`}
                    aria-hidden="true"
                >
                    <Icon className="h-5 w-5" />
                </div>
                {trend && (
                    <div
                        className={`flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-tight ${trend > 0 ? 'bg-green-100/80 text-green-800' : 'bg-red-100/80 text-red-800'}`}
                        aria-label={`${trend > 0 ? 'Incremento' : 'Decremento'} del ${Math.abs(trend)}%`}
                    >
                        {trend > 0 ? <ArrowUp className="h-3 w-3 mr-0.5" aria-hidden="true" /> : <ArrowDown className="h-3 w-3 mr-0.5" aria-hidden="true" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
                <div className="flex items-baseline gap-2 overflow-hidden">
                    <p
                        className={`${getValueFontSize(displayValue)} font-bold text-gray-900 ${displayValue.length > 15 ? 'tracking-tighter' : 'tracking-tight'} break-words leading-none py-1`}
                        title={displayValue}
                    >
                        {displayValue}
                    </p>
                </div>

                {percentage !== undefined && (
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-gray-500">Distribución</span>
                            <span className="text-gray-800 font-bold">{percentage}%</span>
                        </div>
                        <div
                            className="h-2 w-full bg-gray-100/80 rounded-full overflow-hidden shadow-inner"
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-label={`Distribución: ${percentage}%`}
                        >
                            <div
                                className={`h-full transition-all duration-1000 ease-out rounded-full shadow-sm ${barColors[color] || barColors.blue}`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {subtext && (
                    <p className="text-[11px] text-gray-600 font-bold mt-3 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${barColors[color] || barColors.blue} opacity-70`} aria-hidden="true"></span>
                        {subtext}
                    </p>
                )}
            </div>

            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-transparent to-nissan-red/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-700" aria-hidden="true"></div>
        </div>
    );
};

export default StatCard;
