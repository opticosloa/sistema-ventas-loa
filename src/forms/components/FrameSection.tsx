import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';
import { ProductTypeAutocomplete } from './ProductTypeAutocomplete';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Swal from 'sweetalert2';

interface FrameSectionProps {
    formState: FormValues;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPriceChange?: (price: number, id: string | null) => void;
    dolarRate?: number;
}

export const FrameSection: React.FC<FrameSectionProps> = ({
    formState,
    onInputChange,
    onPriceChange,
    dolarRate = 0
}) => {

    const handleProductChange = (fieldName: keyof FormValues, value: string) => {
        onInputChange({
            target: {
                name: fieldName,
                value: value
            }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    const getPrice = (product: any) => {
        const usd = product.precio_usd ? Number(product.precio_usd) : 0;
        const ars = product.precio_venta ? Number(product.precio_venta) : 0;
        if (usd > 0 && dolarRate > 0) return usd * dolarRate;
        return ars;
    };

    const formatPrice = (product: any) => {
        const price = getPrice(product);
        return `$${price.toLocaleString('es-AR')}`;
    };

    // QR Code Scanner Logic
    const [showScanner, setShowScanner] = React.useState(false);

    // Effect to handle scanner lifecycle
    React.useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        if (showScanner) {
            // Small timeout to ensure modal DOM is ready
            const timer = setTimeout(() => {
                scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        showTorchButtonIfSupported: true
                    },
                    /* verbose= */ false
                );

                scanner.render(
                    (decodedText) => {
                        // Success callback
                        console.log("QR Code detected:", decodedText);
                        handleProductChange("armazon", decodedText); // Set the raw value to search

                        // Close scanner and modal
                        if (scanner) {
                            scanner.clear().catch(console.error);
                        }
                        setShowScanner(false);

                        // Optional: Show success feedback
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true
                        });
                        Toast.fire({
                            icon: 'success',
                            title: 'Código QR escaneado'
                        });
                    },
                    (_errorMessage) => {
                        // Error callback (ignore frequent scanning errors)
                    }
                );
            }, 100);

            return () => clearTimeout(timer);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [showScanner]);

    const renderFrameInput = (label: string, fieldName: keyof FormValues) => (
        <div className="flex gap-2 items-end w-full">
            <div className="flex-grow">
                <ProductTypeAutocomplete
                    label={label}
                    type="ARMAZON"
                    value={formState[fieldName] as string}
                    formatPrice={formatPrice}
                    onChange={(val) => {
                        handleProductChange(fieldName, val);
                        if (val === "" && onPriceChange) {
                            onPriceChange(0, null);
                        }
                    }}
                    onProductSelect={(product) => {
                        const name = product.nombre || product.descripcion || "";
                        handleProductChange(fieldName, name);

                        // IMPORTANTE: Necesitamos pasar el ID y el precio al padre
                        if (onPriceChange) {
                            // Pasamos el precio calculado Y el ID del producto
                            onPriceChange(getPrice(product), product.producto_id ? String(product.producto_id) : null);
                        }
                    }}
                />
            </div>
            <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-azul p-3 rounded-lg text-white hover:bg-azul/90 transition-colors h-[42px] flex items-center justify-center mb-[1px]"
                title="Escanear QR"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="5" height="5" x="3" y="3" rx="1" />
                    <rect width="5" height="5" x="16" y="3" rx="1" />
                    <rect width="5" height="5" x="3" y="16" rx="1" />
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                    <path d="M21 21v.01" />
                    <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                    <path d="M3 12h.01" />
                    <path d="M12 3h.01" />
                    <path d="M12 16v.01" />
                    <path d="M16 12h1" />
                    <path d="M21 12v.01" />
                    <path d="M12 21v-1" />
                </svg>
            </button>
        </div>
    );


    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4 mt-4">
            <h3 className="text-blanco font-medium mb-3">Armazones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFrameInput(formState.armazon ? "Armazón *" : "Armazón", "armazon")}
            </div>
            {showScanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 relative">
                        <button
                            onClick={() => setShowScanner(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold mb-4 text-gray-800 text-center">Escanear Código QR</h3>
                        <div id="reader" className="overflow-hidden rounded-lg"></div>
                        <p className="text-sm text-gray-500 text-center mt-4">
                            Apunte la cámara al código QR del armazón
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
};
