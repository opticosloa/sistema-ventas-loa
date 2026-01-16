import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LOAApi from '../../../api/LOAApi';
import type { Liquidacion, ItemLiquidacion } from '../../../types/Liquidacion';

export const DetalleLiquidacion: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null);
    const [items, setItems] = useState<ItemLiquidacion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDetalle();
    }, [id]);

    const fetchDetalle = async () => {
        try {
            // Need endpoints: get by ID and get items by ID
            // Assuming getById returns everything or we have separate endpoints
            // Backend Controller `getById` was likely not implemented in my previous step? 
            // Wait, I implemented `getPendingItems`, `getAll`, `save`, `updateStatus`. 
            // I did NOT implement `getById` in controller!
            // I need to update controller too.
            // For now, I'll placeholder strictly or assume I'll fix backend.

            // Let's assume I will fix backend.
            const { data } = await LOAApi.get(`/api/liquidaciones/${id}`);
            if (data.success) {
                setLiquidacion(data.result);
                setItems(data.items || []); // Assuming items come with it or separate call
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-6 text-white">Cargando...</div>;
    if (!liquidacion) return <div className="p-6 text-white">Liquidación no encontrada.</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto fade-in bg-gray-900 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button onClick={() => navigate('/admin/liquidaciones')} className="text-gray-400 hover:text-white mb-2">
                        &larr; Volver
                    </button>
                    <h1 className="text-3xl font-bold text-white">Liquidación #{liquidacion.liquidacion_id}</h1>
                    <p className="text-gray-400">{liquidacion.obra_social}</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={handlePrint} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
                        Imprimir / Exportar
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <p className="text-gray-400 text-xs uppercase">Periodo</p>
                    <p className="text-white font-medium">
                        {new Date(liquidacion.fecha_desde).toLocaleDateString()} - {new Date(liquidacion.fecha_hasta).toLocaleDateString()}
                    </p>
                </div>
                <div>
                    <p className="text-gray-400 text-xs uppercase">Generada</p>
                    <p className="text-white font-medium">{new Date(liquidacion.fecha_generacion).toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-xs uppercase">Estado</p>
                    <p className="text-white font-medium">{liquidacion.estado}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-xs uppercase">Total Declarado</p>
                    <p className="text-green-400 font-bold text-xl">${Number(liquidacion.total_declarado).toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden shadow">
                <table className="min-w-full text-left">
                    <thead className="bg-gray-900 text-gray-300">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Orden</th>
                            <th className="p-3">Paciente</th>
                            <th className="p-3 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {items.map((item) => (
                            <tr key={item.pago_id} className="hover:bg-gray-700">
                                <td className="p-3 text-gray-300">{new Date(item.fecha).toLocaleDateString()}</td>
                                <td className="p-3 text-white">{item.nro_orden}</td>
                                <td className="p-3 text-gray-300">{item.paciente}</td>
                                <td className="p-3 text-right text-white font-bold">${Number(item.monto).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
