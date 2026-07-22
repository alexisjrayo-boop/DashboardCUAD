import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ text }) => {
    const [show, setShow] = useState(false);

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onClick={() => setShow(!show)}
                className="text-gray-400 hover:text-nissan-red transition-colors"
            >
                <HelpCircle className="h-4 w-4" />
            </button>
            {show && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                    <div className="relative">
                        {text}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
