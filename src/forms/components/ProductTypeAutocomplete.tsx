import React, { useState, useEffect, useMemo } from 'react';
import LOAApi from '../../api/LOAApi';

interface Product {
    producto_id?: number;
    id?: string | number;
    nombre: string;
    descripcion?: string;
    precio_usd: number;
    stock?: number;
    codigo_qr?: string;
}

interface ProductTypeAutocompleteProps {
    type: string;
    value: string;
    onChange: (val: string) => void;
    onProductSelect: (product: Product) => void;
    label: string;
    placeholder?: string;
    className?: string;
    formatPrice?: (product: Product) => number | string;
}

export const ProductTypeAutocomplete: React.FC<ProductTypeAutocompleteProps> = ({
    type,
    value,
    onChange,
    onProductSelect,
    label,
    placeholder = "Buscar...",
    className = "",
    formatPrice
}) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Fetch products by type on mount
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const { data } = await LOAApi.get(`/api/products/type/${type}`);
                if (data.success && Array.isArray(data.result)) {
                    setProducts(data.result);
                }
            } catch (error) {
                console.error(`Error fetching products of type ${type}`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [type]);

    // Filter products based on current input value
    const filteredProducts = useMemo(() => {
        if (!value) return products;
        const lowerVal = value.toLowerCase();
        return products.filter(p =>
            p.nombre.toLowerCase().includes(lowerVal) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(lowerVal)) ||
            (p.codigo_qr && p.codigo_qr.toLowerCase().includes(lowerVal))
        );
    }, [products, value]);

    const handleSelect = (product: Product) => {
        // Use name or description as the display value
        const displayName = product.nombre;
        onChange(displayName);
        onProductSelect(product);
        setShowSuggestions(false);
    };

    return (
        <div className={`relative flex flex-col gap-1 ${className}`}>
            <label className="text-gray-400 text-sm">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                    placeholder={loading ? "Cargando..." : placeholder}
                    className="input w-full"
                    autoComplete="off"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                    {loading ? '⏳' : '▼'}
                </span>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (value || filteredProducts.length > 0) && (
                <ul className="absolute z-50 top-full left-0 right-0 bg-azul border border-blanco rounded-b-lg max-h-60 overflow-y-auto shadow-lg mt-1">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map((product, idx) => (
                            <li
                                key={product.producto_id || idx}
                                onClick={() => handleSelect(product)}
                                className="px-4 py-2 hover:bg-blanco cursor-pointer text-blanco border-b border-blanco last:border-0 flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold">{product.nombre}</div>
                                    <div className="text-xs text-gray-400">{product.descripcion}</div>
                                </div>
                                <div className="text-green-400 font-bold">
                                    {formatPrice
                                        ? formatPrice(product)
                                        : `$${Number(product.precio_usd).toLocaleString('es-AR')}`
                                    }
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 text-gray-400 text-sm">
                            No se encontraron resultados.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};
