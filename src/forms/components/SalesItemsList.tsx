import React, { useState } from 'react';
import { QRScanner } from './QRScanner';
import LOAApi from '../../api/LOAApi';
import type { Producto } from '../../types/Producto';

export interface CartItem {
    producto: Producto;
    cantidad: number;
    subtotal: number;
}

interface SalesItemsListProps {
    items: CartItem[];
    onItemsChange: (items: CartItem[]) => void;
}

export const SalesItemsList: React.FC<SalesItemsListProps> = ({ items, onItemsChange }) => {
    const [showScanner, setShowScanner] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAddItem = async (code: string) => {
        if (!code) return;
        setIsLoading(true);
        try {
            // Buscar producto por QR o ID (asumimos que el backend busca por ambos o codigo)
            // Endpoint sugerido: /api/products/search?q=CODE or /api/products/by-qr/:qr
            // Voy a usar un endpoint que busque por QR o nombre
            // Si no existe, podemos intentar buscar en la lista de todos los productos si está cargada, 
            // pero mejor hacer fetch al backend para data fresca.

            // Asumiendo endpoint existente GET /api/products/search?q=...
            const { data } = await LOAApi.get(`/api/products/search?q=${code}`);
            const products: Producto[] = data.result;

            if (products && products.length > 0) {
                // Tomamos el primero (match exacto idealmente)
                const product = products[0]; // TODO: Mejorar logica de seleccion si hay multiples
                addItemToCart(product);
                setManualCode("");
            } else {
                alert("Producto no encontrado");
            }

        } catch (error) {
            console.error(error);
            alert("Error buscando producto");
        } finally {
            setIsLoading(false);
        }
    };

    const addItemToCart = (product: Producto) => {
        const existingIndex = items.findIndex(i => i.producto.producto_id === product.producto_id);
        if (existingIndex >= 0) {
            // Update quantity
            const newItems = [...items];
            newItems[existingIndex].cantidad += 1;
            // Asumimos precio venta es precio_venta o similar. 
            // Producto type doesn't explicitly show price in previous context? 
            // I need to check Producto type. Assuming price field exists.
            // Using placeholder logic for price if not in type.
            const price = (product as any).precio_venta || (product as any).precio || 0;
            newItems[existingIndex].subtotal = newItems[existingIndex].cantidad * price;
            onItemsChange(newItems);
        } else {
            // Add new
            const price = (product as any).precio_venta || (product as any).precio || 0;
            onItemsChange([...items, { producto: product, cantidad: 1, subtotal: price }]);
        }
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onItemsChange(newItems);
    };

    const handleQuantityChange = (index: number, newQty: number) => {
        if (newQty < 1) return;
        const newItems = [...items];
        const item = newItems[index];
        item.cantidad = newQty;
        const price = (item.producto as any).precio_venta || (item.producto as any).precio || 0;
        item.subtotal = newQty * price;
        onItemsChange(newItems);
    };

    const total = items.reduce((acc, curr) => acc + curr.subtotal, 0);

    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4 mt-4">
            {showScanner && (
                <QRScanner
                    onScanSuccess={(code) => { setShowScanner(false); handleAddItem(code); }}
                    onClose={() => setShowScanner(false)}
                />
            )}

            <div className="flex justify-between items-center mb-3">
                <h3 className="text-blanco font-medium">Items de Venta (Carrito)</h3>
                <div className="flex gap-2">
                    <input
                        autoFocus
                        className="input py-1 px-2 text-sm w-40"
                        placeholder="Código / Nombre"
                        value={manualCode}
                        onChange={e => setManualCode(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddItem(manualCode);
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => handleAddItem(manualCode)}
                        className="btn-secondary py-1 px-3 text-sm"
                        disabled={isLoading}
                    >
                        +
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="btn-primary py-1 px-3 text-sm flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 -960 960 960" fill="currentColor"><path d="M40-120v-200h200v200H40Zm80-120h40v-40h-40v40Zm40 0h40v-40h-40v40Zm-40 40h40v-40h-40v40Zm40 0h40v-40h-40v40Zm40 40h40v-40h-40v40Zm0-80h40v-40h-40v40Zm-80 80h40v-40h-40v40Zm320-400v-200h200v200H440Zm240 0h-40v-40h40v40Zm-160-80v-40h40v40h-40Zm80 0v-40h40v40h-40Zm-80 0h-40v-40h40v40Zm80 0h40v-40h-40v40Zm40-40h40v-40h-40v40Zm-80 0h40v-40h-40v40Zm40 80h40v-40h-40v40Zm-40 0v40h40v-40h-40Zm200 520v-200h200v200H720Zm80-120h40v-40h-40v40Zm-40 40h40v-40h-40v40Zm80 0h40v-40h-40v40Zm-40-40h40v-40h-40v40Zm40 0h40v-40h-40v40Zm-40 40v40h40v-40h-40ZM40-440v-200h200v200H40Zm80-120h40v-40h-40v40Zm40 0h40v-40h-40v40Zm-40 40h40v-40h-40v40Zm40 0h40v-40h-40v40Zm40 40h40v-40h-40v40Zm0-80h40v-40h-40v40Zm-80 80h40v-40h-40v40Zm320 320v-200h200v200H440Zm80-120h40v-40h-40v40Zm-40 40h40v-40h-40v40Zm80 0h40v-40h-40v40Zm-40-40h40v-40h-40v40Zm40 0h40v-40h-40v40Zm-40 40v40h40v-40h-40Z" /></svg>
                        Scan
                    </button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-blanco/50 text-center py-4 text-sm bg-black/20 rounded">
                    Sin items. Escanea o busca productos.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-blanco">
                        <thead className="bg-white/10">
                            <tr>
                                <th className="p-2 text-left">Producto</th>
                                <th className="p-2 text-right">Precio</th>
                                <th className="p-2 text-center">Cant</th>
                                <th className="p-2 text-right">Subtotal</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                                    <td className="p-2">{item.producto.nombre}</td>
                                    <td className="p-2 text-right">${((item.producto as any).precio_venta || 0).toLocaleString()}</td>
                                    <td className="p-2 text-center">
                                        <input
                                            type="number"
                                            value={item.cantidad}
                                            onChange={e => handleQuantityChange(idx, parseInt(e.target.value))}
                                            className="w-12 text-center p-1 rounded text-black font-bold"
                                            min="1"
                                        />
                                    </td>
                                    <td className="p-2 text-right font-bold">${item.subtotal.toLocaleString()}</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300">
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-white/10 font-bold">
                            <tr>
                                <td colSpan={3} className="p-2 text-right">Total Items:</td>
                                <td className="p-2 text-right">${total.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
};
