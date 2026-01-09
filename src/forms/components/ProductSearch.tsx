import React, { useState } from 'react';
import LOAApi from '../../api/LOAApi';
import { QRScanner } from './QRScanner';

// Define a minimal Product interface based on usage
interface Product {
    id: string | number;
    nombre: string;
    descripcion?: string;
    precio_venta?: number | string;
}

interface ProductSearchProps {
    value: string;
    onChange: (val: string) => void;
    onProductSelect?: (product: Product) => void;
    label: string;
    placeholder?: string;
    className?: string;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
    value,
    onChange,
    onProductSelect,
    label,
    placeholder = "Buscar producto...",
    className = ""
}) => {
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const handleSearch = async (term: string) => {
        if (!term) return alert("Ingrese un término de búsqueda para " + label);

        setLoading(true);
        try {
            const { data } = await LOAApi.get(`/api/products/${term}`);
            if (data.success && data.result) {
                const product = data.result;
                if (onProductSelect) {
                    onProductSelect(product);
                } else {
                    // Default behavior: just update text if no handler
                    onChange(product.nombre);
                }
            } else {
                alert("Producto no encontrado");
            }
        } catch (error) {
            console.error(error);
            alert("Error al buscar producto");
        } finally {
            setLoading(false);
        }
    };

    const onScanSuccess = (decodedText: string) => {
        setShowScanner(false);
        handleSearch(decodedText);
    };

    const onScanFailure = (_error: any) => {
        // console.warn(error);
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-gray-400 text-sm">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="input flex-1"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearch(value);
                        }
                    }}
                />

                <button
                    type="button"
                    onClick={() => handleSearch(value)}
                    disabled={loading}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white disabled:opacity-50"
                    title="Buscar por ID/Nombre"
                >
                    {loading ? '...' : '🔍'}
                </button>

                <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="p-2 bg-celeste rounded-lg hover:opacity-80 text-negro"
                    title="Escanear QR/Barra"
                >
                    📷
                </button>
            </div>

            {showScanner && (
                <QRScanner
                    onScanSuccess={onScanSuccess}
                    onScanFailure={onScanFailure}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
};
