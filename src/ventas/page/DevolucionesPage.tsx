import React, { useState } from 'react';
import LOAApi from '../../api/LOAApi';


export const DevolucionesPage: React.FC = () => {
    const [searchId, setSearchId] = useState("");
    const [sale, setSale] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // index -> qty to return
    const [loading, setLoading] = useState(false);


    const handleSearch = async () => {
        if (!searchId) return;
        setLoading(true);
        try {
            // Support search by ID or DNI?
            // If numeric and short, ID. If long, DNI logic?
            // User requested "Buscador de ventas por ID o DNI Cliente".
            // Currently backend /api/sales/:id searches by ID.
            // /api/sales/by-client-dni/:dni searches by DNI (returns list).

            // Heuristic
            if (searchId.length > 6) {
                // DNI
                const { data } = await LOAApi.get(`/api/sales/by-client-dni/${searchId}`);
                if (data.result && data.result.length > 0) {
                    // If multiple, maybe show a modal? For now take latest.
                    const latest = data.result[0];
                    loadSale(latest.venta_id);
                } else {
                    alert("No se encontraron ventas para este DNI");
                    setSale(null);
                }
            } else {
                // ID
                loadSale(searchId);
            }
        } catch (error) {
            console.error(error);
            alert("Error buscando venta");
        } finally {
            setLoading(false);
        }
    };

    const loadSale = async (id: string) => {
        try {
            const { data } = await LOAApi.get(`/api/sales/${id}`);
            if (data.success && data.result) {
                const s = Array.isArray(data.result) ? data.result[0] : data.result;
                setSale(s);
                // Parse items if they are JSON or array
                // Depending on backend, items might be in 'items' prop
                setItems(s.items || []);
                setSelectedItems({});
            } else {
                alert("Venta no encontrada");
                setSale(null);
            }
        } catch (e) {
            console.error(e);
            alert("Error cargando detalles");
        }
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

    const handleSubmit = async () => {
        const keys = Object.keys(selectedItems);
        if (keys.length === 0) return alert("Seleccione items para devolver");

        if (!window.confirm("¿Confirmar devolución? Esto anulará los items y generará el movimiento de stock.")) return;

        setLoading(true);
        try {
            // Payload: items = [{ producto_id, cantidad }]
            const itemsPayload = keys.map(k => ({
                producto_id: items[parseInt(k)].producto_id,
                cantidad: selectedItems[k]
            }));

            const { data } = await LOAApi.post('/api/sales/returns', {
                venta_id: sale.venta_id,
                items: itemsPayload
            });

            if (data.success) {
                alert("Devolución procesada correctamente");
                setSale(null);
                setItems([]);
                setSearchId("");
            }

        } catch (error) {
            console.error(error);
            alert("Error procesando devolución");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 text-blanco fade-in">
            <h2 className="text-2xl font-bold mb-6">Módulo de Devoluciones</h2>

            <div className="flex gap-4 mb-8">
                <input
                    className="input w-64"
                    placeholder="ID Venta o DNI Cliente"
                    value={searchId}
                    onChange={e => setSearchId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="btn-primary" disabled={loading}>
                    {loading ? "Buscando..." : "Buscar Venta"}
                </button>
            </div>

            {sale && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex justify-between mb-4">
                        <h3 className="text-xl font-bold">Venta #{sale.venta_id}</h3>
                        <div className="text-right">
                            <p className="text-gray-400">{new Date(sale.fecha).toLocaleDateString()}</p>
                            <p className="font-bold text-celeste">Total: ${parseFloat(sale.total).toLocaleString()}</p>
                        </div>
                    </div>

                    <p className="mb-4">Cliente: {sale.cliente_nombre || 'N/A'}</p>

                    <table className="w-full text-left mb-6">
                        <thead className="bg-white/10 text-sm">
                            <tr>
                                <th className="p-2">Seleccionar</th>
                                <th className="p-2">Producto</th>
                                <th className="p-2">Cant. Vendida</th>
                                <th className="p-2">Cant. Devolver</th>
                                <th className="p-2 text-right">Precio Unit.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const isSelected = selectedItems[idx] !== undefined;
                                return (
                                    <tr key={idx} className={`border-b border-gray-700 ${isSelected ? 'bg-red-900/20' : ''}`}>
                                        <td className="p-2">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleItem(idx, item.cantidad)}
                                                className="w-5 h-5 accent-celeste"
                                            />
                                        </td>
                                        <td className="p-2">{item.producto_nombre || item.nombre_producto || 'Item ' + (idx + 1)}</td>
                                        <td className="p-2">{item.cantidad}</td>
                                        <td className="p-2">
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
                                        <td className="p-2 text-right">${parseFloat(item.precio_unitario).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={Object.keys(selectedItems).length === 0 || loading}
                            className="btn-secondary bg-red-600 hover:bg-red-500 border-none text-white px-6 py-2"
                        >
                            {loading ? "Procesando..." : "Confirmar Devolución"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
