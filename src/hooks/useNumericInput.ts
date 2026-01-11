import { useCallback } from 'react';

/**
 * Hook para normalizar entradas numéricas en formularios.
 * Convierte automáticamente ',' en '.' y asegura que el valor sea procesable por JS.
 */
export const useNumericInput = (onInputChange: (e: any) => void) => {

    const handleNumericChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // 1. Normalización: Cambiar coma por punto
        let normalizedValue = value.replace(',', '.');

        // 2. Limpieza: Permitir solo números, un punto decimal y un signo menos al inicio
        // Explicación Regex: 
        // ^-?             -> Opcional signo menos al inicio
        // \d* -> Cero o más dígitos
        // (\.\d{0,2})?    -> Opcional punto seguido de hasta 2 decimales (ajustable)
        const regex = /^-?\d*(\.\d{0,2})?$/;

        if (normalizedValue === '' || normalizedValue === '-' || regex.test(normalizedValue)) {
            // Creamos un evento sintético para mantener compatibilidad con onInputChange
            const syntheticEvent = {
                ...e,
                target: {
                    ...e.target,
                    name,
                    value: normalizedValue
                }
            };
            onInputChange(syntheticEvent as any);
        }
    }, [onInputChange]);

    return { handleNumericChange };
};