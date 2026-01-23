import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import LOAApi from '../../../api/LOAApi';
import type { ItemLiquidacion } from '../../../types/Liquidacion';
import type { ObraSocial } from '../../../types/ObraSocial';

export const NuevaLiquidacion: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Selection
    const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
    const [selectedObraId, setSelectedObraId] = useState<number | ''>('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState(''); // Optional filter, but useful

    // Step 2: Items
    const [pendingItems, setPendingItems] = useState<ItemLiquidacion[]>([]);

    useEffect(() => {
        fetchObras();
    }, []);

    const fetchObras = async () => {
        try {
            const { data } = await LOAApi.get('/api/obras-sociales');
            setObrasSociales(data.result.filter((o: ObraSocial) => o.activo));
        } catch (error) {
            console.error(error);
        }
    };

    const handleSearchItems = async () => {
        if (!selectedObraId) return Swal.fire("Info", "Seleccione Obra Social", "info");
        setLoading(true);
        try {
            const { data } = await LOAApi.get(`/api/liquidaciones/pending?obra_social_id=${selectedObraId}`);
            if (data.success) {
                // Initialize all as selected by default? Or let user select.
                // Let's select all by default for convenience
                const items = data.result.map((i: any) => ({ ...i, selected: true }));
                setPendingItems(items);
                setStep(2);
            }
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error buscando items pendientes", "error");
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (index: number) => {
        const newItems = [...pendingItems];
        newItems[index].selected = !newItems[index].selected;
        setPendingItems(newItems);
    };

    const getSelectedTotal = () => {
        return pendingItems.filter(i => i.selected).reduce((acc, curr) => acc + Number(curr.monto), 0);
    };

    const handleSubmit = async () => {
        const selected = pendingItems.filter(i => i.selected);
        if (selected.length === 0) return Swal.fire("Info", "Seleccione al menos un item", "info");

        // Determine date range from items if not set manually, or use today
        const computedFechaDesde = fechaDesde || new Date().toISOString().split('T')[0];
        const computedFechaHasta = fechaHasta || new Date().toISOString().split('T')[0];

        setLoading(true);
        try {
            const payload = {
                obra_social_id: selectedObraId,
                fecha_desde: computedFechaDesde,
                fecha_hasta: computedFechaHasta,
                total: getSelectedTotal(),
                items: selected.map(i => i.pago_id) // IDs to link
            };

            await LOAApi.post('/api/liquidaciones', payload);
            Swal.fire("Éxito", "Liquidación generada exitosamente", "success");
            navigate('/admin/liquidaciones');
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error generando liquidación", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Nueva Liquidación</h1>

            {step === 1 && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl text-white mb-4">Paso 1: Seleccionar Obra Social</h2>

                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Obra Social</label>
                        <select
                            className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2"
                            value={selectedObraId}
                            onChange={e => setSelectedObraId(Number(e.target.value))}
                        >
                            <option value="">Seleccione...</option>
                            {obrasSociales.map(os => (
                                <option key={os.obra_social_id} value={os.obra_social_id}>{os.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-300 mb-2">Fecha Desde (Opcional)</label>
                            <input
                                type="date"
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2"
                                value={fechaDesde}
                                onChange={e => setFechaDesde(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 mb-2">Fecha Hasta (Opcional)</label>
                            <input
                                type="date"
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2"
                                value={fechaHasta}
                                onChange={e => setFechaHasta(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleSearchItems}
                            disabled={loading || !selectedObraId}
                            className="bg-celeste hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
                        >
                            {loading ? 'Buscando...' : 'Buscar Pendientes'}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl text-white mb-4">Paso 2: Confirmar Items para Liquidar</h2>

                    <div className="max-h-96 overflow-y-auto mb-4">
                        <table className="min-w-full text-left">
                            <thead className="bg-gray-900 text-gray-300">
                                <tr>
                                    <th className="p-2">Seleccionar</th>
                                    <th className="p-2">Fecha</th>
                                    <th className="p-2">Nro Orden</th>
                                    <th className="p-2">Paciente</th>
                                    <th className="p-2">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {pendingItems.map((item, idx) => (
                                    <tr key={item.pago_id} className="border-b border-gray-700 hover:bg-gray-700">
                                        <td className="p-2">
                                            <input
                                                type="checkbox"
                                                checked={item.selected}
                                                onChange={() => toggleItem(idx)}
                                                className="w-4 h-4 text-celeste rounded"
                                            />
                                        </td>
                                        <td className="p-2 text-gray-300">{new Date(item.fecha).toLocaleDateString()}</td>
                                        <td className="p-2 text-white">{item.nro_orden || '-'}</td>
                                        <td className="p-2 text-gray-300">{item.paciente || 'Desconocido'}</td>
                                        <td className="p-2 text-celeste font-bold">${Number(item.monto).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {pendingItems.length === 0 && (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay items pendientes encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-600 pt-4">
                        <div className="text-white text-xl">
                            Total a Declarar: <span className="font-bold text-green-400">${getSelectedTotal().toLocaleString()}</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setStep(1)}
                                className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded"
                            >
                                Volver
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || getSelectedTotal() === 0}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
                            >
                                {loading ? 'Generando...' : 'Generar Liquidación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
