import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { X, Camera } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { parseDNIArgentina } from '../../helpers';
import type { Cliente } from '../../types/Cliente';

interface BotonEscanearDNIProps {
    onScanComplete: (cliente: Partial<Cliente>) => void;
    className?: string;
}

export const BotonEscanearDNI: React.FC<BotonEscanearDNIProps> = ({ onScanComplete, className }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const regionId = 'reader-dni'; // ID único para el contenedor del scanner

    useEffect(() => {
        // Limpiar scanner al desmontar si está activo
        return () => {
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(console.error);
                }
                scannerRef.current.clear();
            }
        };
    }, []);

    const startScanning = async () => {
        setIsScanning(true);
        setError(null);

        // Esperar a que el DOM se actualice y el div 'reader' exista
        setTimeout(async () => {
            try {
                // Configuraciones del scanner
                const formatsToSupport = [Html5QrcodeSupportedFormats.PDF_417];
                const config = {
                    fps: 30, // Más fluido
                    // qrbox: { width: 300, height: 150 }, // Caja rectangular para DNI
                    aspectRatio: 1.0,
                    formatsToSupport: formatsToSupport,
                    videoConstraints: {
                        facingMode: "environment",
                        width: { min: 1280, ideal: 1920 },
                        height: { min: 720, ideal: 1080 }
                    },
                    disableFlip: true
                };

                scannerRef.current = new Html5Qrcode(regionId);

                // Función auxiliar para intentar iniciar el scanner con diferentes configuraciones
                const tryStartScanner = async (constraints: MediaTrackConstraints, attemptName: string) => {
                    console.log(`Intentando iniciar cámara (${attemptName})...`, constraints);
                    await scannerRef.current?.start(
                        constraints,
                        config,
                        (decodedText) => {
                            handleScanSuccess(decodedText);
                        },
                        (_errorMessage) => {
                            // Ignorar errores de frame si no son críticos
                        }
                    );
                };

                try {
                    // Intento 1: Cámara trasera, Alta Resolución
                    // NOTA: Pasamos las constraints directamente en el primer argumento
                    await tryStartScanner(
                        {
                            facingMode: "environment",
                            width: { min: 1280, ideal: 1920 },
                            height: { min: 720, ideal: 1080 }
                        },
                        "Alta Resolución"
                    );
                } catch (errHighRes) {
                    console.warn("Fallo intento Alta Resolución, probando configuración estándar...", errHighRes);
                    try {
                        // Intento 2: Cámara trasera, sin forzar resolución (dejar que decida el navegador/librería)
                        await tryStartScanner(
                            { facingMode: "environment" },
                            "Estándar Trasera"
                        );
                    } catch (errStandard) {
                        console.warn("Fallo intento Estándar Trasera, probando cámara por defecto...", errStandard);
                        try {
                            // Intento 3: Cualquier cámara (fallback final)
                            await tryStartScanner(
                                { facingMode: "user" }, // O simplemente {} vacio si facingMode falla
                                "Cámara Frontal/Defecto"
                            );
                        } catch (errFinal) {
                            throw errFinal; // Si falla todo, lanzar error
                        }
                    }
                }

            } catch (err: any) {
                console.error("Error fatal iniciando cámara:", err);
                setError("No se pudo acceder a la cámara. Verifique permisos y hardware.");
                // No ocultamos el modal inmediatamente para que el usuario vea el error
            }
        }, 100);
    };

    const stopScanning = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("Error deteniendo scanner:", err);
            }
        }
        setIsScanning(false);
    };

    const handleScanSuccess = async (decodedText: string) => {
        await stopScanning();
        try {
            const data = parseDNIArgentina(decodedText);
            const clienteEscaneado: Partial<Cliente> = {
                nombre: data.nombre,
                apellido: data.apellido,
                dni: data.dni,
                fecha_nacimiento: data.fechaNacimiento,
                // sexo: data.sexo 
            };
            onScanComplete(clienteEscaneado);
        } catch (err: any) {
            console.error("Error parseando DNI:", err);
            // Mostrar error pero no bloquear permanentemente, quizás un toast sería mejor
            Swal.fire("Error", "Error leyendo datos del DNI: " + (err.message || "Formato inválido"), "error");
        }
    };

    return (
        <div className={`relative ${className || ''}`}>
            {!isScanning ? (
                <button
                    type="button"
                    onClick={startScanning}
                    className="flex h-full w-full items-center justify-center gap-2 px-4 py-2 bg-celeste text-white rounded-lg hover:bg-celeste/20 transition-colors shadow-sm font-medium"
                >
                    <Camera size={20} />
                    <span>Escanear DNI</span>
                </button>
            ) : (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
                    <div className="w-full max-w-lg bg-black rounded-lg overflow-hidden relative border border-gray-700">

                        {/* Header con botón cerrar */}
                        <div className="flex justify-between items-center p-3 bg-gray-900 border-b border-gray-800 absolute top-0 w-full z-10 opacity-80">
                            <h3 className="text-white text-sm font-medium">Escaneando DNI (PDF417)</h3>
                            <button
                                onClick={stopScanning}
                                className="text-gray-300 hover:text-white bg-gray-800 p-1 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Contenedor del video */}
                        <div id={regionId} className="w-full bg-black min-h-[300px]" />

                        {/* Overlay o instrucciones */}
                        <div className="p-4 bg-gray-900 text-center border-t border-gray-800">
                            <p className="text-gray-300 text-sm mb-2">
                                Enfoque el código de barras PDF417 en el frente del DNI.
                            </p>
                            {error && (
                                <p className="text-red-400 text-xs font-bold mt-2 bg-red-900/20 p-2 rounded">
                                    {error}
                                </p>
                            )}
                            <button
                                onClick={stopScanning}
                                className="mt-2 px-4 py-1 bg-red-600/80 text-white text-sm rounded hover:bg-red-700 transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
