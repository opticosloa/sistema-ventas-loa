import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Loader2 } from 'lucide-react';
import { parseDNIArgentina } from '../../helpers';
import type { Cliente } from '../../types/Cliente';

interface BotonEscanearDNIProps {
    onScanComplete: (cliente: Partial<Cliente>) => void;
    className?: string; // Para permitir personalización de estilos desde el padre
}

export const BotonEscanearDNI: React.FC<BotonEscanearDNIProps> = ({ onScanComplete }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Efecto para mantener el foco en el input invisible cuando se está escaneando
    useEffect(() => {
        if (isScanning && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isScanning]);

    const handleStartScan = () => {
        setIsScanning(true);
        setInputValue('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleBlur = () => {
        // Opcional: Si pierde el foco, podríamos cancelar el escaneo o intentar recuperarlo.
        // Por simplicidad, si el usuario hace clic afuera, cancelamos el modo de espera.
        // Pero damos un pequeño timeout para no cancelar si solo es un parpadeo de foco
        setTimeout(() => {
            if (document.activeElement !== inputRef.current) {
                // setIsScanning(false); // Comentado: A veces es molesto si se pierde foco accidentalmente.
                // Dejamos que el usuario cancele explícitamente o escanee.
            }
        }, 200);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            // El escáner suele enviar Enter al final
            processScan(inputValue);
            setIsScanning(false);
            setInputValue(''); // Limpiar para la próxima
        } else if (e.key === 'Escape') {
            setIsScanning(false);
            setInputValue('');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const processScan = (rawData: string) => {
        try {
            const data = parseDNIArgentina(rawData);

            // Adaptar los datos parseados al tipo Cliente (parcial)
            const clienteEscaneado: Partial<Cliente> = {
                nombre: data.nombre,
                apellido: data.apellido,
                dni: data.dni,
                // Sexo no está explícitamente en la interfaz Cliente, pero podría ser útil si se agrega
                // sexo: data.sexo, 
                fecha_nacimiento: data.fechaNacimiento,
            };

            onScanComplete(clienteEscaneado);

        } catch (error: any) {
            console.error("Error procesando DNI:", error);
            alert(error.message || "Error al leer el DNI. Intente nuevamente.");
        }
    };

    return (
        <div className={'relative inline-block'}>
            {!isScanning ? (
                <button
                    type="button"
                    onClick={handleStartScan}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <ScanBarcode size={30} />
                </button>
            ) : (
                <div className="relative">
                    {/* Botón visual que indica estado de espera */}
                    <button
                        type="button"
                        onClick={() => setIsScanning(false)} // Cancelar al hacer click de nuevo
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors shadow-sm font-medium animate-pulse"
                    >
                        <Loader2 size={30} className="animate-spin" />
                        <span>Esperando lectura...</span>
                    </button>

                    {/* Input invisible que captura el teclado */}
                    <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        autoFocus
                        autoComplete="off"
                    />

                    {/* Hint flotante pequeño */}
                    <div className="absolute top-full left-0 mt-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded shadow-sm whitespace-nowrap z-10">
                        Dispare el escáner ahora o presione ESC para cancelar
                    </div>
                </div>
            )}
        </div>
    );
};
