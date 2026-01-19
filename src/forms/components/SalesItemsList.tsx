import React, { useState, useRef, useEffect } from 'react';
import { Search, Package } from 'lucide-react';
import LOAApi from '../../api/LOAApi';
import type { Producto } from '../../types/Producto';

export interface CartItem {
    producto: Producto;
    cantidad: number;
    subtotal: number;
    allowDelete?: boolean;
}

interface SalesItemsListProps {
    items: CartItem[];
    onItemsChange: (items: CartItem[]) => void;
    dolarRate?: number;
    readonly?: boolean;
}

export const SalesItemsList: React.FC<SalesItemsListProps> = ({ items, onItemsChange, dolarRate = 0, readonly = false }) => {
    // Autocomplete State
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<Producto[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const searchTimeout = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar resultados al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getPrice = (product: any) => {
        const usd = product.precio_usd ? Number(product.precio_usd) : 0;
        const ars = product.precio_venta ? Number(product.precio_venta) : 0;
        if (usd > 0 && dolarRate > 0) return usd * dolarRate;
        return ars;
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (term.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        setShowResults(true);

        searchTimeout.current = setTimeout(async () => {
            try {
                // Cambiar a tu endpoint de búsqueda parcial
                const { data } = await LOAApi.get(`/api/products/search/${term}`);
                setResults(data.result || []);
            } catch (err) {
                console.error("Error buscando productos", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const addItemToCart = (product: Producto) => {
        const existingIndex = items.findIndex(i => i.producto.producto_id === product.producto_id);
        const price = getPrice(product);

        if (existingIndex >= 0) {
            const newItems = [...items];
            newItems[existingIndex].cantidad += 1;
            newItems[existingIndex].subtotal = newItems[existingIndex].cantidad * price;
            onItemsChange(newItems);
        } else {
            onItemsChange([...items, { producto: product, cantidad: 1, subtotal: price }]);
        }
        setSearchTerm("");
        setShowResults(false);
    };

    // ... (Mantén handleRemoveItem y handleQuantityChange igual que antes)

    return (
        <section className="bg-white/5 border border-white/20 rounded-xl p-4 mt-4" ref={containerRef}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Package size={18} className="text-cyan-400" />
                    Items de Venta
                </h3>
            </div>

            {/* Buscador Autocomplete - Hidden in Readonly */}
            {!readonly && (
                <div className="relative mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-slate-50 text-slate-900 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Buscar producto por nombre o ID..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        {isSearching && (
                            <div className="absolute right-3 top-3 w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                    </div>

                    {/* Dropdown de Resultados */}
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 max-h-64 overflow-y-auto">
                            {results.length > 0 ? (
                                results.map((prod) => (
                                    <button
                                        key={prod.producto_id}
                                        type="button"
                                        onClick={() => addItemToCart(prod)}
                                        className="w-full text-left px-4 py-3 hover:bg-cyan-50 border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-800">{prod.nombre}</div>
                                            <div className="text-xs text-slate-500">Stock: {prod.stock} | Ubicación: {prod.ubicacion || 'N/A'}</div>
                                        </div>
                                        <div className="text-cyan-600 font-bold">
                                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(getPrice(prod))}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-slate-500 text-sm">
                                    No se encontraron productos.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tabla de Carrito */}
            <div className="mt-6 overflow-x-auto">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-white/5 rounded-lg border border-dashed border-gray-600/50">
                        {readonly ? 'No hay detalles de items disponibles.' : 'No hay productos agregados al carrito de venta directa.'}
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-celeste border-b border-gray-600/50">
                                <th className="p-3 font-semibold text-blanco">Producto</th>
                                <th className="p-3 font-semibold text-blanco text-right">Precio Unit.</th>
                                <th className="p-3 font-semibold text-blanco text-center">Cant.</th>
                                <th className="p-3 font-semibold text-blanco text-right">Subtotal</th>
                                {!readonly && <th className="p-3 font-semibold text-blanco text-center">Acción</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {items.map((item, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <div className="font-medium text-white">{item.producto.nombre}</div>
                                    </td>
                                    <td className="p-3 text-right text-gray-300">
                                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                                            (item.subtotal && item.cantidad) ? (item.subtotal / item.cantidad) : getPrice(item.producto)
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="bg-slate-700/50 text-white py-1 px-3 rounded-md text-sm font-bold">
                                            {item.cantidad}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right text-green-400 font-bold">
                                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.subtotal || 0)}
                                    </td>
                                    {!readonly && (
                                        <td className="p-3 text-center">
                                            {(item.allowDelete !== false) ? (
                                                <button
                                                    onClick={() => {
                                                        const newItems = items.filter((_, i) => i !== index);
                                                        onItemsChange(newItems);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-full transition-colors"
                                                    title="Eliminar ítem"
                                                >
                                                    ❌
                                                </button>
                                            ) : (
                                                <span className="text-gray-500 text-xs text-center block" title="Este item depende de la receta">
                                                    (Receta)
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};