import React from 'react';
import { parseCalldate } from '../../utils/dateUtils';

const DashboardTable = ({ data, isOutgoing }) => {
    return (
        <div id="dashboard-table" className="bg-white rounded-none p-6 border-t-4 border-nissan-red shadow-md">
            <h3 className="text-lg font-bold mb-6 uppercase tracking-wide border-b border-gray-200 pb-2 text-gray-800">
                <span className="border-b-2 border-nissan-red pb-2">Últimos Registros</span>
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 font-bold">Fecha</th>
                            <th className="px-4 py-3 font-bold">Línea</th>
                            <th className="px-4 py-3 font-bold">Origen</th>
                            <th className="px-4 py-3 font-bold">Destino</th>
                            <th className="px-4 py-3 font-bold">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.slice(0, 10).map((row) => {
                            const currentLine = isOutgoing ? row.src : row.dst;
                            return (
                                <tr key={row.cdr_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-light">{parseCalldate(row.calldate).toLocaleString()}</td>
                                    <td className="px-4 py-3 font-semibold text-gray-700">
                                        {currentLine === '2878750303' ? 'Tuxtepec' :
                                            currentLine === '9717120739' ? 'Juchitán' :
                                                currentLine === '9716884348' ? 'Salina Cruz' :
                                                    currentLine}
                                    </td>
                                    <td className="px-4 py-3 font-medium">{row.source}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-gray-900">{row.destination}</span>
                                        {row.destination_desc && (
                                            <span className="block text-xs text-nissan-red uppercase font-bold mt-0.5">{row.destination_desc}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider ${row.disposition === 'ANSWERED' ? 'text-green-600' :
                                            row.disposition === 'NO ANSWER' ? 'text-red-600' :
                                                'text-orange-600'
                                            }`}>
                                            {row.disposition}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardTable;
