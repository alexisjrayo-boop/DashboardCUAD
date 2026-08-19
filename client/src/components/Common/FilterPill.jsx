import React from 'react';
import { X } from 'lucide-react';

const FilterPill = ({ icon: Icon, label, value, onRemove }) => {
    return (
        <div className="mono-pill inline-flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-mono text-gray-700 shadow-xs transition-all duration-200 hover:border-nissan-red/50 hover:shadow-[0_0_12px_rgba(195,0,47,0.1)]">
            {Icon && <Icon className="h-3.5 w-3.5 text-nissan-red" />}
            <span className="text-gray-400 font-medium">
                {label}:
            </span>
            <span className="text-gray-900 font-bold">
                {value}
            </span>
            <button
                onClick={onRemove}
                className="ml-1 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-nissan-red"
                title="Remover filtro"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
};

export default FilterPill;


