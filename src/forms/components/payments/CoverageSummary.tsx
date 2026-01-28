import React from 'react';

interface CoverageSummaryProps {
    details: { name: string; amount: number; reason: string }[];
    total: number;
}

export const CoverageSummary: React.FC<CoverageSummaryProps> = ({ details, total }) => {
    if (total <= 0) return null;

    return (
        <div className="mb-4 bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
            <div className="bg-slate-700 px-3 py-2 text-sm font-bold text-gray-200 flex justify-between">
                <span>Resumen Cobertura</span>
                <span className="text-green-400">$ {total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="p-3 text-xs">
                <table className="w-full text-left text-gray-300">
                    <thead>
                        <tr className="border-b border-slate-600">
                            <th className="pb-1">Item</th>
                            <th className="pb-1 text-right">Monto</th>
                            <th className="pb-1 text-right">Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-700/50 last:border-0">
                                <td className="py-1 pr-2 truncate max-w-[120px]" title={item.name}>{item.name}</td>
                                <td className="py-1 text-right text-green-300 font-medium">
                                    ${item.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-1 text-right text-gray-500 italic">{item.reason}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
