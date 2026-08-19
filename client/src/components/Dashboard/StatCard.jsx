import { ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, trend, color = "blue", onClick, percentage }) => {
    const colorClasses = {
        nissan: "text-[#C3002F] bg-red-50 ring-red-100",
        blue: "text-blue-600 bg-blue-50 ring-blue-100",
        green: "text-emerald-600 bg-emerald-50 ring-emerald-100",
        purple: "text-purple-600 bg-purple-50 ring-purple-100",
        orange: "text-amber-600 bg-amber-50 ring-amber-100",
        red: "text-red-600 bg-red-50 ring-red-100",
        gray: "text-gray-600 bg-gray-50 ring-gray-100",
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
            className={`relative bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_10px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300 group hover:-translate-y-0.5 ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C3002F]/50' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className={`p-3 rounded-xl ring-4 transition-transform duration-300 group-hover:scale-110 ${colorClasses[color] || colorClasses.blue}`}
                    aria-hidden="true"
                >
                    <Icon className="h-5 w-5" />
                </div>
                {trend !== undefined && trend !== null && (
                    <div
                        className={`mono-pill flex items-center px-2.5 py-1 text-[10px] font-bold tracking-tight rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                        aria-label={`${trend > 0 ? 'Incremento' : 'Decremento'} del ${Math.abs(trend)}%`}
                    >
                        {trend > 0 ? <ArrowUp className="h-3 w-3 mr-1" aria-hidden="true" /> : <ArrowDown className="h-3 w-3 mr-1" aria-hidden="true" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
                <div className="flex items-baseline gap-2 overflow-hidden">
                    <p
                        className={`${getValueFontSize(displayValue)} font-extrabold text-gray-900 ${displayValue.length > 15 ? 'tracking-tighter' : 'tracking-tight'} break-words leading-none py-1`}
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
                            className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner"
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-label={`Distribución: ${percentage}%`}
                        >
                            <div
                                className={`h-full transition-all duration-1000 ease-out rounded-full ${barColors[color] || barColors.blue}`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {subtext && (
                    <p className="text-[11px] text-slate-400 font-medium mt-3 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse`} aria-hidden="true"></span>
                        {subtext}
                    </p>
                )}
            </div>

            {/* Mono-Charts subtle ambient glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-transparent to-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" aria-hidden="true"></div>
        </div>
    );
};

export default StatCard;

