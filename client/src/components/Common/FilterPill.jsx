import React from 'react';
import { X } from 'lucide-react';

const FilterPill = ({ icon: Icon, label, value, onRemove }) => {
    return (
        <div className="inline-flex items-center gap-2 bg-nissan-red/10 border border-nissan-red/30 px-3 py-1.5 rounded-full text-sm group hover:bg-nissan-red/20 transition-colors">
            {Icon && <Icon className="h-3.5 w-3.5 text-nissan-red" />}
            <span className="font-medium text-gray-700">
                {label}:
            </span>
            <span className="text-gray-900 font-semibold">
                {value}
            </span>
            <button
                onClick={onRemove}
                className="ml-1 p-0.5 hover:bg-nissan-red/30 rounded-full transition-colors"
                title="Remover filtro"
            >
                <X className="h-3.5 w-3.5 text-nissan-red" />
            </button>
        </div>
    );
};

export default FilterPill;
