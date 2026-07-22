import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

const MultiSelect = ({ options, selected, onChange, placeholder = 'Select options...', disabled = false, ariaLabelledBy }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const dropdownRef = useRef(null);
    const listboxRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset focused index when filtering or closing
    useEffect(() => {
        setFocusedIndex(-1);
    }, [searchTerm, isOpen]);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (value) => {
        if (disabled) return;
        const newSelected = selected.includes(value)
            ? selected.filter(item => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const handleSelectAll = () => {
        if (disabled) return;
        if (selected.length === filteredOptions.length && filteredOptions.length > 0) {
            onChange([]); // Deselect all visible
        } else {
            const allValues = filteredOptions.map(opt => opt.value);
            // Merge with existing selected that might be hidden by search
            const unique = [...new Set([...selected, ...allValues])];
            onChange(unique);
        }
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                setIsOpen(false);
                break;
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0) {
                    toggleOption(filteredOptions[focusedIndex].value);
                }
                break;
            case 'Tab':
                // Let natural tab happen but close dropdown
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div className={`relative w-full group/select ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby={ariaLabelledBy}
                className={`w-full h-9 px-3 text-left bg-white border border-gray-100 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:border-nissan-red/30 focus:ring-4 focus:ring-nissan-red/5
                    ${disabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'text-gray-800 hover:border-gray-200 shadow-sm'
                    }
                `}
            >
                <span className={`block truncate pr-6 text-gray-900`}>
                    {selected.length === 0
                        ? placeholder
                        : `${selected.length} seleccionados`}
                </span>
            </button>
            <ChevronDown className={`pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-300 transition-all group-hover/select:text-nissan-red ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />

            {isOpen && (
                <div
                    className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                    role="listbox"
                    aria-multiselectable="true"
                    ref={listboxRef}
                >
                    {/* Search */}
                    <div className="sticky top-0 z-20 bg-white p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" aria-hidden="true" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-nissan-red"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Buscar extensión"
                            />
                        </div>
                        <button
                            onClick={handleSelectAll}
                            className="mt-2 text-xs text-nissan-red font-bold uppercase hover:underline w-full text-left focus:outline-none"
                        >
                            {selected.length > 0 && selected.length === filteredOptions.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                        </button>
                    </div>

                    {/* Options */}
                    <div role="none">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-2 text-gray-500 text-sm" role="status">No hay coincidencias</div>
                        ) : (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    role="option"
                                    aria-selected={selected.includes(option.value)}
                                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 transition-colors ${focusedIndex === index ? 'bg-nissan-red/5' : 'hover:bg-gray-50'}`}
                                    onClick={() => toggleOption(option.value)}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(option.value)}
                                            onChange={() => { }} // Handled by div click
                                            tabIndex="-1"
                                            className="h-4 w-4 text-nissan-red border-gray-300 rounded focus:ring-nissan-red"
                                            aria-hidden="true"
                                        />
                                        <span className={`ml-3 block truncate ${selected.includes(option.value) ? 'font-semibold' : 'font-normal'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                    {selected.includes(option.value) && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-nissan-red">
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
