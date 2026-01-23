import React, { useState } from 'react';
import Swal from 'sweetalert2';
import LOAApi from '../../api/LOAApi';
import { useAuthStore } from '../../hooks';
import { SupervisorAuthModal } from '../../components/modals/SupervisorAuthModal';


export const DevolucionesPage: React.FC = () => {
    const [searchId, setSearchId] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [sale, setSale] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // index -> qty to return
    const [loading, setLoading] = useState(false);
    const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
    const [showDetails, setShowDetails] = useState<Record<number, boolean>>({}); // index -> boolean

    const { role } = useAuthStore();


    const handleSearch = async () => {
        if (!searchId) return;
        setLoading(true);
        setSearchResults([]);
        setSale(null);
        setItems([]);

        try {
            const { data } = await LOAApi.get(`/api/sales/search?q=${searchId}`);
            if (data.success && data.result && data.result.length > 0) {
                setSearchResults(data.result);
                // If only 1 result and it is a UUID match, maybe select it?
                // But generally users want to see the list first.
            } else {
                Swal.fire("Info", "No se encontraron ventas con ese criterio", "info");
            }
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error buscando ventas", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadSale = async (id: string) => {
        setLoading(true);
        try {
            const { data } = await LOAApi.get(`/api/sales/${id}`);
            if (data.success && data.result) {
                const s = Array.isArray(data.result) ? data.result[0] : data.result;
                setSale(s);
                // Parse items if they are JSON or array
                const parsedItems = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
                setItems(parsedItems);
                setSelectedItems({});
                setShowDetails({});
            } else {
                Swal.fire("Info", "Venta no encontrada", "info");
                setSale(null);
            }
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Error cargando detalles", "error");
        } finally {
            setLoading(false);
        }
    };

    const selectSale = (selectedSale: any) => {
        // Fetch full details to ensure we have items and specific data
        loadSale(selectedSale.venta_id);
    };

    const toggleItem = (idx: number, maxQty: number) => {
        const current = selectedItems[idx] || 0;
        if (current > 0) {
            const copy = { ...selectedItems };
            delete copy[idx];
            setSelectedItems(copy);
        } else {
            setSelectedItems({ ...selectedItems, [idx]: maxQty }); // Default to max
        }
    };

    const updateQty = (idx: number, qty: number, max: number) => {
        if (qty < 0) return;
        if (qty > max) qty = max;
        if (qty === 0) {
            const copy = { ...selectedItems };
            delete copy[idx];
            setSelectedItems(copy);
        } else {
            setSelectedItems({ ...selectedItems, [idx]: qty });
        }
    };

    const toggleDetails = (idx: number) => {
        setShowDetails(prev => ({ ...prev, [idx]: !prev[idx] }));
    }

    const processReturn = async (bypassConfirm = false) => {
        if (!bypassConfirm) {
            const confirmResult = await Swal.fire({
                title: '¿Confirmar devolución?',
                text: "Esto anulará los items y generará el movimiento de stock.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, confirmar',
                cancelButtonText: 'Cancelar'
            });
            if (!confirmResult.isConfirmed) return;
        }

        setLoading(true);
        try {
            // Payload: items = [{ producto_id, cantidad, precio }]
            const itemsPayload = Object.keys(selectedItems).map(k => ({
                producto_id: items[parseInt(k)].producto_id,
                cantidad: selectedItems[k],
                precio: items[parseInt(k)].precio_unitario
            }));

            // Calculate estimated refund total for logging
            const totalRefund = Object.keys(selectedItems).reduce((acc, k) => {
                const idx = parseInt(k);
                return acc + (items[idx].precio_unitario * selectedItems[idx]);
            }, 0);

            const { data } = await LOAApi.post('/api/sales/returns', {
                venta_id: sale.venta_id,
                items: itemsPayload,
                total_reembolsado: totalRefund
            });

            if (data.success) {
                Swal.fire("Éxito", "Devolución procesada correctamente", "success");
                setSale(null);
                setItems([]);
                setSearchResults([]);
                setSearchId("");
            }

        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error procesando devolución", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        const keys = Object.keys(selectedItems);
        if (keys.length === 0) return Swal.fire("Atención", "Seleccione items para devolver", "warning");

        // Check if user is Admin/SuperAdmin
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
            processReturn(false);
        } else {
            setIsSupervisorModalOpen(true);
        }
    };

    const renderItemExtras = (item: any) => {
        // Try to find prescriptions details
        // Structure might vary. Looking for esfera, cilindro, eje.
        // Or if they are nested in a 'detalles' object.

        let details = item;
        if (item.detalles) details = item.detalles; // if nested

        // Helper to safely display value
        const val = (v: any) => v !== undefined && v !== null && v !== '' ? v : '-';

        // Check if looks like a prescription item (has sphere/cyl)
        const hasPrescription = details.esfera !== undefined || details.cilindro !== undefined || details.eje !== undefined;

        // Check for frame info (armazón)
        const hasFrame = details.tipo_armazon || details.marca || details.modelo || details.color_armazon;

        if (!hasPrescription && !hasFrame) {
            // Maybe it's defined as keys ESFERA_OD, CILINDRO_OD etc in the item root?
            // Let's check typical keys
            return <p className="text-xs text-gray-400 mt-1 italic">Sin detalles adicionales disponibles.</p>;
        }

        return (
            <div className="mt-2 text-xs bg-black/20 p-2 rounded">
                {(hasPrescription) && (
                    <div className="mb-1">
                        <strong>Cristal:</strong> {details.tipo || ''} {details.material || ''}
                        <span className="ml-2">Esfera: {val(details.esfera)}</span> |
                        <span className="ml-2">Cil: {val(details.cilindro)}</span> |
                        <span className="ml-2">Eje: {val(details.eje)}</span>
                    </div>
                )}
                {hasFrame && (
                    <div>
                        <strong>Armazón:</strong> {val(details.marca)} {val(details.modelo)} {val(details.color_armazon)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto p-6 text-blanco fade-in border border-blanco rounded-lg">
            <h2 className="text-2xl font-bold mb-6">Módulo de Devoluciones</h2>

            <div className="flex gap-4 mb-8">
                <input
                    className="input w-full md:w-96"
                    placeholder="ID de Venta o DNI del Cliente"
                    value={searchId}
                    onChange={e => setSearchId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="btn-primary" disabled={loading}>
                    {loading ? "Buscando..." : "Buscar"}
                </button>
            </div>

            {/* Results List */}
            {!sale && searchResults.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">Resultados ({searchResults.length})</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-black/30 rounded-lg overflow-hidden">
                            <thead className="bg-white/10 text-sm">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">DNI</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchResults.map((s) => (
                                    <tr key={s.venta_id} className="border-b border-gray-700 hover:bg-white/5 transition-colors">
                                        <td className="p-3 text-sm">{new Date(s.fecha).toLocaleDateString()} {new Date(s.fecha).toLocaleTimeString()}</td>
                                        <td className="p-3 font-medium">{s.cliente_nombre ? `${s.cliente_nombre} ${s.cliente_apellido || ''}` : 'Cliente Generico'}</td>
                                        <td className="p-3 text-sm">{s.cliente_dni || '-'}</td>
                                        <td className="p-3 text-right font-bold text-crema">${parseFloat(s.total || 0).toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => selectSale(s)} className="btn-sm btn-secondary bg-blue-600 hover:bg-blue-500 text-white">
                                                Seleccionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {sale && (
                <div className="p-6 rounded-lg border border-blanco bg-black/40">
                    <div className="flex justify-between items-start mb-6 border-b border-gray-600 pb-4">
                        <div>
                            <h3 className="text-2xl font-bold text-celeste">Venta #{sale.venta_id.slice(0, 8)}...</h3>
                            <p className="text-gray-300">Cliente: {sale.cliente_nombre ? `${sale.cliente_nombre} ${sale.cliente_apellido || ''}` : 'N/A'}</p>
                            <p className="text-gray-400 text-sm">{new Date(sale.fecha).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <button onClick={() => setSale(null)} className="text-sm underline text-gray-400 mb-2 block">Volver a lista</button>
                            <p className="font-bold text-2xl text-crema">${parseFloat(sale.total).toLocaleString()}</p>
                        </div>
                    </div>

                    <h4 className="font-semibold mb-2">Items de la venta</h4>
                    <table className="w-full text-left mb-6">
                        <thead className="bg-white/10 text-sm">
                            <tr>
                                <th className="p-2">Devolver</th>
                                <th className="p-2">Producto</th>
                                <th className="p-2 text-center">Cant. Original</th>
                                <th className="p-2 text-center">Cant. A Devolver</th>
                                <th className="p-2 text-right">Precio Unit.</th>
                                <th className="p-2 text-center">Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const isSelected = selectedItems[idx] !== undefined;
                                const isDetailsVisible = showDetails[idx];
                                return (
                                    <React.Fragment key={idx}>
                                        <tr className={`border-b border-gray-700 ${isSelected ? 'bg-red-900/20' : ''}`}>
                                            <td className="p-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleItem(idx, item.cantidad)}
                                                    className="w-5 h-5 accent-celeste cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-2 align-top">
                                                <span className="font-medium">{item.producto_nombre || item.nombre_producto || 'Item ' + (idx + 1)}</span>
                                            </td>
                                            <td className="p-2 text-center align-top">{item.cantidad}</td>
                                            <td className="p-2 text-center align-top">
                                                {isSelected && (
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={item.cantidad}
                                                        value={selectedItems[idx]}
                                                        onChange={e => updateQty(idx, parseInt(e.target.value), item.cantidad)}
                                                        className="w-16 p-1 text-black rounded text-center font-bold"
                                                    />
                                                )}
                                            </td>
                                            <td className="p-2 text-right align-top">${parseFloat(item.precio_unitario).toLocaleString()}</td>
                                            <td className="p-2 text-center align-top">
                                                <button
                                                    onClick={() => toggleDetails(idx)}
                                                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                                                >
                                                    {isDetailsVisible ? 'Ocultar' : 'Ver Detalles'}
                                                </button>
                                            </td>
                                        </tr>
                                        {isDetailsVisible && (
                                            <tr className="bg-gray-800/30">
                                                <td colSpan={6} className="p-3 pl-12 border-b border-gray-700">
                                                    {renderItemExtras(item)}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setSale(null)}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={Object.keys(selectedItems).length === 0 || loading}
                            className="btn-primary bg-red-600 hover:bg-red-500 border-none text-white px-6 py-2"
                        >
                            {loading ? "Procesando..." : "Confirmar Devolución"}
                        </button>
                    </div>
                </div>
            )}

            <SupervisorAuthModal
                isOpen={isSupervisorModalOpen}
                onClose={() => setIsSupervisorModalOpen(false)}
                onSuccess={() => {
                    processReturn(true);
                }}
                actionName="Autorizar Devolución"
            />
        </div>
    );
};
