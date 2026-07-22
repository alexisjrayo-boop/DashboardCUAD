import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'; // Assuming lucide-react is available or use text

const ExtensionStatsTable = ({ data }) => {
    const { data: allRows } = useDashboard();
    const navigate = useNavigate();

    const [sortColumn, setSortColumn] = useState('total');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 8;

    // Handle Row Click
    const handleRowClick = (extension, name) => {
        // Filter rows where destination OR src matches the extension
        const filtered = allRows.filter(r => r.destination === extension || r.src === extension);
        navigate('/details', { state: { title: `Detalle Extensión ${extension} - ${name}`, data: filtered } });
    };

    // Helper to format duration (seconds to Xm Ys)
    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}m ${s}s`;
    };

    // Sort handler
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    // Sort data with useMemo
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let aVal, bVal;

            switch (sortColumn) {
                case 'extension':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'total':
                    aVal = a.total;
                    bVal = b.total;
                    break;
                case 'answered':
                    aVal = a.answered;
                    bVal = b.answered;
                    break;
                case 'noAnswer':
                    aVal = a.noAnswer;
                    bVal = b.noAnswer;
                    break;
                case 'busy':
                    aVal = a.busy;
                    bVal = b.busy;
                    break;
                case 'failed':
                    aVal = a.failed;
                    bVal = b.failed;
                    break;
                case 'totalDuration':
                    aVal = a.totalDuration;
                    bVal = b.totalDuration;
                    break;
                case 'avgDuration':
                    aVal = a.avgDuration;
                    bVal = b.avgDuration;
                    break;
                case 'successRate':
                    aVal = parseFloat(a.successRate);
                    bVal = parseFloat(b.successRate);
                    break;
                default:
                    aVal = a.total;
                    bVal = b.total;
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }, [data, sortColumn, sortDirection]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const paginatedData = sortedData.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Sort indicator component
    const SortIndicator = ({ column }) => {
        if (sortColumn !== column) return <span className="text-gray-400 ml-1" aria-hidden="true">↕</span>;
        return <span className="text-nissan-red ml-1" aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };

    // Keyboard entry for rows
    const handleKeyDown = (e, extension, name) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick(extension, name);
        }
    };

    // Keyboard entry for sort
    const handleSortKeyDown = (e, column) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort(column);
        }
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col h-full group">
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-fuchsia-500 rounded-full"></div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Análisis por Extensión</h3>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5">Métricas de rendimiento por destino</p>
                    </div>
                </div>
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                        Total: <span className="text-nissan-red">{data.length}</span> extensiones
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto flex-grow custom-scrollbar">
                <table className="w-full text-sm text-left text-gray-600 border-separate border-spacing-0">
                    <thead className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50/50 sticky top-0 z-10">
                        <tr>
                            <th
                                className="px-4 py-4 font-bold text-left cursor-pointer hover:text-nissan-red transition-colors border-b border-gray-100 bg-gray-50/50 first:rounded-tl-lg"
                                onClick={() => handleSort('extension')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'extension')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'extension' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                Extensión <SortIndicator column="extension" />
                            </th>
                            <th
                                className="px-4 py-4 font-bold cursor-pointer hover:text-nissan-red transition-colors border-b border-gray-100 bg-gray-50/50 text-center"
                                onClick={() => handleSort('total')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'total')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'total' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                Total <SortIndicator column="total" />
                            </th>
                            <th
                                className="px-4 py-4 font-bold text-green-600 cursor-pointer hover:text-green-700 transition-colors border-b border-gray-100 bg-gray-50/50 text-center"
                                onClick={() => handleSort('answered')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'answered')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'answered' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                Contestadas <SortIndicator column="answered" />
                            </th>
                            <th
                                className="px-4 py-4 font-bold text-red-500 cursor-pointer hover:text-red-600 transition-colors border-b border-gray-100 bg-gray-50/50 text-center"
                                onClick={() => handleSort('noAnswer')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'noAnswer')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'noAnswer' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                No Cont. <SortIndicator column="noAnswer" />
                            </th>
                            <th
                                className="px-4 py-4 font-bold text-orange-500 cursor-pointer hover:text-orange-600 transition-colors border-b border-gray-100 bg-gray-50/50 text-center"
                                onClick={() => handleSort('busy')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'busy')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'busy' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                Ocup. <SortIndicator column="busy" />
                            </th>
                            <th
                                className="px-4 py-4 font-bold text-gray-600 cursor-pointer hover:text-gray-800 transition-colors border-b border-gray-100 bg-gray-50/50 text-center"
                                onClick={() => handleSort('failed')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'failed')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'failed' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                Fallidas <SortIndicator column="failed" />
                            </th>
                            {/* Éxito - Only on Mobile (2nd position) */}
                            <th
                                className="px-4 py-4 font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors border-b border-gray-100 bg-gray-50/50 text-center md:hidden"
                                onClick={() => handleSort('successRate')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'successRate')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'successRate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                Éxito <SortIndicator column="successRate" />
                            </th>
                            <th
                                className="px-4 py-4 font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors border-b border-gray-100 bg-gray-50/50 text-center hidden md:table-cell last:rounded-tr-lg"
                                onClick={() => handleSort('successRate')}
                                onKeyDown={(e) => handleSortKeyDown(e, 'successRate')}
                                tabIndex="0"
                                role="button"
                                aria-sort={sortColumn === 'successRate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                Éxito <SortIndicator column="successRate" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedData.map((row, index) => (
                            <tr
                                key={index}
                                onClick={() => handleRowClick(row.extension, row.name)}
                                onKeyDown={(e) => handleKeyDown(e, row.extension, row.name)}
                                tabIndex="0"
                                role="button"
                                className="group/row hover:bg-gray-50/80 transition-all text-center cursor-pointer active:bg-gray-100 border-none relative focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-nissan-red"
                                title="Ver detalles de esta extensión"
                                aria-label={`Ver detalles de la extensión ${row.name}, número ${row.extension}`}
                            >
                                <td className="px-4 py-4 text-left">
                                    <div className="font-bold text-gray-900 truncate max-w-[150px] group-hover/row:text-nissan-red transition-colors" title={row.name}>{row.name}</div>
                                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{row.extension}</span>
                                </td>
                                {/* Success Rate - Mobile position */}
                                <td className="px-4 py-4 md:hidden">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-[11px] font-bold ${parseFloat(row.successRate) > 70 ? 'text-green-600' :
                                            parseFloat(row.successRate) > 40 ? 'text-orange-600' : 'text-red-500'
                                            }`}>{row.successRate}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-semibold text-gray-700">{row.total}</td>
                                <td className="px-4 py-4">
                                    <span className="px-2 py-1 bg-green-50 text-green-700 text-[11px] font-bold rounded-md border border-green-100">
                                        {row.answered}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="px-2 py-1 bg-red-50 text-red-600 text-[11px] font-bold rounded-md border border-red-100">
                                        {row.noAnswer}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="px-2 py-1 bg-orange-50 text-orange-600 text-[11px] font-bold rounded-md border border-orange-100">
                                        {row.busy}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[11px] font-bold rounded-md border border-gray-100 shadow-sm">
                                        {row.failed}
                                    </span>
                                </td>
                                {/* Success Rate - Desktop position */}
                                <td className="px-4 py-4 align-middle hidden md:table-cell">
                                    <div className="flex items-center gap-3 justify-center">
                                        <div
                                            className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0"
                                            role="progressbar"
                                            aria-valuenow={row.successRate}
                                            aria-valuemin="0"
                                            aria-valuemax="100"
                                            aria-label={`Tasa de éxito: ${row.successRate}%`}
                                        >
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${parseFloat(row.successRate) > 70 ? 'bg-green-500' :
                                                    parseFloat(row.successRate) > 40 ? 'bg-orange-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${row.successRate}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-[11px] font-bold w-10 text-right ${parseFloat(row.successRate) > 70 ? 'text-green-600' :
                                            parseFloat(row.successRate) > 40 ? 'text-orange-600' : 'text-red-500'
                                            }`} aria-hidden="true">{row.successRate}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                            <RefreshCw className="h-6 w-6 text-gray-200 animate-pulse" />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-widest">No hay datos disponibles</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {
                totalPages > 1 && (
                    <div className="mt-auto pt-6 flex justify-between items-center border-t border-gray-50">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed grayscale' : 'text-gray-600 hover:bg-gray-50 hover:text-nissan-red active:scale-95'}`}
                            aria-label="Ir a la página anterior"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            Anterior
                        </button>
                        <div className="flex items-center gap-1" aria-current="page">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Página</span>
                            <span className="bg-nissan-red/10 text-nissan-red px-2 py-0.5 rounded text-[10px] font-bold">{currentPage}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">de {totalPages}</span>
                        </div>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed grayscale' : 'text-gray-600 hover:bg-gray-50 hover:text-nissan-red active:scale-95'}`}
                            aria-label="Ir a la página siguiente"
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                )
            }
        </div >
    );
};

export default ExtensionStatsTable;
