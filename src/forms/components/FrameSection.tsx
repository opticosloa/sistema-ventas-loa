import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';
import { ProductTypeAutocomplete } from './ProductTypeAutocomplete'; // Import new component



interface FrameSectionProps {
    formState: FormValues;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPriceChange?: (price: number) => void;
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

    const renderFrameInput = (label: string, fieldName: keyof FormValues) => (
        <ProductTypeAutocomplete
            label={label}
            type="ARMAZON"
            value={formState[fieldName] as string}
            onChange={(val) => {
                handleProductChange(fieldName, val);
                if (val === "" && onPriceChange) {
                    onPriceChange(0);
                }
            }}
            onProductSelect={(product) => {
                const name = product.nombre || product.descripcion || "";
                handleProductChange(fieldName, name);
                if (onPriceChange) {
                    onPriceChange(getPrice(product));
                }
            }}
        />
    );


    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4 mt-4">
            <h3 className="text-blanco font-medium mb-3">Armazones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFrameInput(formState.armazon ? "Armazón *" : "Armazón", "armazon")}
            </div>
        </section>
    );
};
