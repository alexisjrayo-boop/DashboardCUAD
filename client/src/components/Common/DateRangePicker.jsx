import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, X } from 'lucide-react';
import { es } from 'date-fns/locale';
import { registerLocale } from 'react-datepicker';

// Register Spanish locale
registerLocale('es', es);

const DateRangePicker = ({ startDate, endDate, onDateChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);

    // Convert string dates to Date objects
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr);
        } catch (e) {
            return null;
        }
    };

    // Sync internal state with props
    useEffect(() => {
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        setDateRange([start, end]);
    }, [startDate, endDate]);

    // Format date for display
    const formatDate = (date) => {
        if (!date) return '';
        try {
            return new Date(date).toLocaleString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '';
        }
    };

    // Handle date change
    const handleDateChange = (update) => {
        const [start, end] = update;
        setDateRange(update);

        // Only call onChange when both dates are selected
        if (start && end) {
            // Set start to 00:00:00
            const startDateTime = new Date(start);
            startDateTime.setHours(0, 0, 0, 0);

            // Set end to 23:59:59
            const endDateTime = new Date(end);
            endDateTime.setHours(23, 59, 59, 999);

            // Format to datetime-local format
            const formatDateTime = (d) => {
                const pad = (n) => n < 10 ? '0' + n : n;
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            onDateChange(formatDateTime(startDateTime), formatDateTime(endDateTime));
            setIsOpen(false);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setDateRange([null, null]);
        onDateChange('', '');
    };

    const [start, end] = dateRange;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={start && end ? `Periodo seleccionado: ${formatDate(start)} a ${formatDate(end)}. Hacer clic para cambiar.` : "Seleccionar periodo de fechas"}
                className={`
                    relative flex items-center justify-between w-full px-4 py-2.5 text-sm
                    bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-200
                    rounded-lg
                    focus:bg-white focus:border-nissan-red focus:ring-0
                    transition-all outline-none
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer text-gray-700'}
                    ${isOpen ? 'bg-white border-nissan-red ring-0 custom-shadow' : ''}
                `}
            >
                {/* Left Icon (Absolute or Flex) */}
                <Calendar className={`h-4 w-4 flex-shrink-0 ${isOpen ? 'text-nissan-red' : 'text-gray-400'}`} aria-hidden="true" />

                {/* Centered Text */}
                <div className="flex-1 text-center truncate px-2 font-medium">
                    {start && end
                        ? `${formatDate(start)} - ${formatDate(end)}`
                        : <span className="text-gray-400 font-normal">Seleccionar periodo...</span>
                    }
                </div>

                {/* Right Icon/Placeholder */}
                <div className="w-4 flex flex-shrink-0 justify-end">
                    {start && end && !disabled ? (
                        <div
                            className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear(e);
                            }}
                            role="button"
                            tabIndex="0"
                            aria-label="Limpiar fechas seleccionadas"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleClear(e);
                                }
                            }}
                            title="Limpiar fechas"
                        >
                            <X className="h-4 w-4 text-gray-400 hover:text-nissan-red" aria-hidden="true" />
                        </div>
                    ) : (
                        <div className="w-4" aria-hidden="true" /> // Spacer to balance center alignment if needed
                    )}
                </div>
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Calendar Popup */}
                    <div className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white min-w-max border border-gray-100 overflow-hidden">
                        <DatePicker
                            selected={start}
                            onChange={handleDateChange}
                            startDate={start}
                            endDate={end}
                            selectsRange
                            inline
                            monthsShown={1}
                            dateFormat="dd/MM/yyyy"
                            locale="es"
                            showMonthDropdown
                            showYearDropdown
                            dropdownMode="select"
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default DateRangePicker;
