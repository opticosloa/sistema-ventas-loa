import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';
import { ProductSearch } from './ProductSearch';

interface FrameSectionProps {
    formState: FormValues;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPriceChange?: (price: number) => void;
}

export const FrameSection: React.FC<FrameSectionProps> = ({
    formState,
    onInputChange,
    onPriceChange
}) => {

    const handleProductChange = (fieldName: keyof FormValues, value: string) => {
        onInputChange({
            target: {
                name: fieldName,
                value: value
            }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    const renderFrameInput = (label: string, fieldName: keyof FormValues) => (
        <ProductSearch
            label={label}
            value={formState[fieldName] as string}
            onChange={(val) => handleProductChange(fieldName, val)}
            onProductSelect={(product) => {
                const name = product.nombre || product.descripcion || "";
                handleProductChange(fieldName, name);
                if (onPriceChange && product.precio_venta) {
                    onPriceChange(Number(product.precio_venta));
                }
            }}
        />
    );

    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4 mt-4">
            <h3 className="text-blanco font-medium mb-3">Armazones (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFrameInput("Armazón", "armazon")}
            </div>
        </section>
    );
};
