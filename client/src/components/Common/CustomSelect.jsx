import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
    options = [],
    value,
    onChange,
    name,
    placeholder = 'Seleccionar...',
    disabled = false,
    ariaLabelledBy
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const dropdownRef = useRef(null);
    const listboxRef = useRef(null);

    // Normalize options format: array of { value, label }
    const normalizedOptions = options.map(opt =>
        typeof opt === 'object' && opt !== null ? opt : { value: opt, label: opt }
    );

    // Find current selected label
    const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));
    const displayText = selectedOption ? selectedOption.label : placeholder;

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

    // Reset focused index when closing
    useEffect(() => {
        if (!isOpen) {
            setFocusedIndex(-1);
        } else {
            const currentIndex = normalizedOptions.findIndex(opt => String(opt.value) === String(value));
            setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, value, normalizedOptions]);

    const handleSelect = (optionValue) => {
        if (disabled) return;
        if (onChange) {
            // Support standard event format or direct value
            onChange({ target: { name, value: optionValue } });
        }
        setIsOpen(false);
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
                setFocusedIndex(prev => (prev < normalizedOptions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < normalizedOptions.length) {
                    handleSelect(normalizedOptions[focusedIndex].value);
                }
                break;
            case 'Tab':
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div
            className={`relative w-full group/select ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${isOpen ? 'z-[100]' : 'z-10'}`}
            ref={dropdownRef}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby={ariaLabelledBy}
                className={`w-full h-9 px-3 text-left bg-white border rounded-lg text-xs font-bold transition-all cursor-pointer outline-none flex items-center justify-between
                    ${isOpen
                        ? 'border-[#C3002F]/40 ring-4 ring-[#C3002F]/5'
                        : 'border-gray-100 hover:border-gray-200 shadow-sm'
                    }
                    ${disabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'text-gray-900'
                    }
                `}
            >
                <span className="block truncate pr-2 text-gray-900">
                    {displayText}
                </span>
                <ChevronDown
                    className={`pointer-events-none h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#C3002F]' : 'text-gray-400 group-hover/select:text-[#C3002F]'
                    }`}
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <div
                    className="absolute z-[100] mt-1 w-full bg-white shadow-2xl max-h-60 rounded-xl py-1 text-base ring-1 ring-black/10 border border-gray-200 overflow-auto focus:outline-none sm:text-sm animate-fadeIn"
                    role="listbox"
                    ref={listboxRef}
                >
                    {normalizedOptions.length === 0 ? (
                        <div className="px-4 py-2 text-gray-400 text-xs italic">No hay opciones</div>
                    ) : (
                        normalizedOptions.map((option, index) => {
                            const isSelected = String(option.value) === String(value);
                            const isFocused = focusedIndex === index;

                            return (
                                <div
                                    key={String(option.value)}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`cursor-pointer select-none relative py-2 pl-3 pr-8 text-xs transition-colors flex items-center justify-between
                                        ${isFocused ? 'bg-gray-50' : ''}
                                        ${isSelected
                                            ? 'bg-red-50/70 text-[#C3002F] font-black'
                                            : 'text-gray-700 hover:bg-red-50/40 hover:text-[#C3002F] font-semibold'
                                        }
                                    `}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span className="block truncate">
                                        {option.label}
                                    </span>
                                    {isSelected && (
                                        <Check className="h-4 w-4 text-[#C3002F] flex-shrink-0 ml-2" aria-hidden="true" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
