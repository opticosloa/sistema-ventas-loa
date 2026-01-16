import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LOAApi from '../../../api/LOAApi';
import type { Liquidacion } from '../../../types/Liquidacion';

export const AdminLiquidaciones: React.FC = () => {
    const navigate = useNavigate();
    const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLiquidaciones();
    }, []);

    const fetchLiquidaciones = async () => {
        setLoading(true);
        try {
            const { data } = await LOAApi.get('/api/liquidaciones');
            if (data.success) {
                setLiquidaciones(data.result);
            }
        } catch (error) {
            console.error("Error fetching liquidaciones:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case 'BORRADOR': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">BORRADOR</span>;
            case 'PRESENTADA': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-200 text-blue-800">PRESENTADA</span>;
            case 'PAGADA': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800">PAGADA</span>;
            case 'RECHAZADA': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-800">RECHAZADA</span>;
            default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">{estado}</span>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Liquidaciones Obras Sociales</h1>
                <button
                    onClick={() => navigate('nueva')}
                    className="bg-celeste hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    + Nueva Liquidación
                </button>
            </div>

            {loading && <p className="text-gray-400">Cargando...</p>}

            <div className="bg-gray-800 rounded-lg shadow overflow-hidden overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">ID</th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Obra Social</th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Periodo</th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Items</th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Total</th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {liquidaciones.map((liq) => (
                            <tr key={liq.liquidacion_id}>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm text-gray-300">
                                    #{liq.liquidacion_id}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm text-white font-medium">
                                    {liq.obra_social}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm text-gray-400">
                                    {new Date(liq.fecha_desde).toLocaleDateString()} - {new Date(liq.fecha_hasta).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm text-gray-300">
                                    {liq.cant_items}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm text-white font-bold">
                                    ${Number(liq.total_declarado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm">
                                    {getStatusBadge(liq.estado)}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm">
                                    <button
                                        onClick={() => navigate(liq.liquidacion_id.toString())}
                                        className="text-celeste hover:underline mr-3"
                                    >
                                        Ver Detalle
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {liquidaciones.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-center text-gray-500">
                                    No hay liquidaciones registradas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
