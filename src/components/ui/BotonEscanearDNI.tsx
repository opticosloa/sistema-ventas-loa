import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { X, Camera } from 'lucide-react';
import { BrowserPDF417Reader, type IScannerControls } from '@zxing/browser';
import { parseDNIArgentina } from '../../helpers';
import type { Cliente } from '../../types/Cliente';

interface BotonEscanearDNIProps {
    onScanComplete: (cliente: Partial<Cliente>) => void;
    className?: string;
}

export const BotonEscanearDNI: React.FC<BotonEscanearDNIProps> = ({ onScanComplete, className }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const codeReaderRef = useRef<BrowserPDF417Reader | null>(null);

    useEffect(() => {
        // Inicializar el lector una sola vez
        codeReaderRef.current = new BrowserPDF417Reader();

        // Cleanup al desmontar
        return () => {
            stopScanning();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    const getBackCameraDeviceId = async (): Promise<string | undefined> => {
        try {
            const devices = await BrowserPDF417Reader.listVideoInputDevices();
            // Buscar cámara trasera por etiqueta
            const backCamera = devices.find(device =>
                /back|trasera|environment/i.test(device.label)
            );

            if (backCamera) {
                return backCamera.deviceId;
            }

            // Si no se encuentra por etiqueta, devolvemos undefined para que la librería o constraints decidan
            // O podríamos intentar devolver el último dispositivo asumiendo que es la trasera en móviles
            if (devices.length > 0) {
                // Estrategia común: la última cámara suele ser la trasera en algunos dispositivos, 
                // pero es arriesgado. Preferible intentar con constraints si no hay ID.
                return undefined;
            }

            return undefined;
        } catch (err) {
            console.error("Error al listar dispositivos:", err);
            return undefined;
        }
    };

    const startScanning = async () => {
        setIsScanning(true);
        setError(null);

        // Dar tiempo a que el modal se renderice y el <video> esté disponible en el DOM
        setTimeout(async () => {
            if (!videoRef.current || !codeReaderRef.current) return;

            try {
                // Primero intentamos obtener el ID de la cámara trasera
                let deviceId = await getBackCameraDeviceId();

                // Configuración de constraints para intentar forzar la cámara trasera si no tenemos ID
                // Nota: decodeFromVideoDevice acepta deviceId. Si es undefined, usa la default.
                // Para forzar 'environment' sin ID, tendríamos que usar getUserMedia primero o decodeFromConstraints si estuviera expuesto fácilmente.
                // Sin embargo, @zxing/browser maneja esto principalmente via deviceId.

                // Si no encontramos deviceId explícito de 'back', intentamos pasar undefined 
                // pero esto podría abrir la frontal.
                // Una alternativa robusta es iterar dispositivos.

                // Opción B: Usar constraints directos con `getUserMedia` para seleccionar la cámara 
                // y luego pasar el stream o el deviceId obtenido.

                // Vamos a intentar obtener el stream correcto primero para asegurar 'environment'
                if (!deviceId) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: "environment" }
                        });
                        // Obtener el deviceId del track
                        const track = stream.getVideoTracks()[0];
                        if (track) {
                            const settings = track.getSettings();
                            deviceId = settings.deviceId;
                            // Detenemos este stream ya que el lector abrirá el suyo propio
                            track.stop();
                        }
                    } catch (e) {
                        console.warn("No se pudo acceder a la cámara con facingMode environment", e);
                    }
                }

                const controls = await codeReaderRef.current.decodeFromVideoDevice(
                    deviceId,
                    videoRef.current,
                    (result, _err, _controls) => {
                        if (result) {
                            handleScanSuccess(result.getText());
                        }
                        // Ignoramos errores continuos de "No MultiFormat Readers were able to detect..."
                    }
                );

                controlsRef.current = controls;

            } catch (err: any) {
                console.error("Error iniciando el scanner:", err);
                setError("No se pudo iniciar la cámara. Verifique permisos.");
            }
        }, 100);
    };

    const stopScanning = () => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScanSuccess = (decodedText: string) => {
        // Detener scanner primero
        stopScanning();

        try {
            console.log("DNI Escaneado Raw:", decodedText);
            const data = parseDNIArgentina(decodedText);

            const clienteEscaneado: Partial<Cliente> = {
                nombre: data.nombre,
                apellido: data.apellido,
                dni: data.dni,
                fecha_nacimiento: data.fechaNacimiento,
                // sexo: data.sexo 
            };

            onScanComplete(clienteEscaneado);

            // Feedback visual opcional
            Swal.fire({
                icon: 'success',
                title: 'DNI Escaneado',
                text: `${data.apellido}, ${data.nombre}`,
                timer: 1500,
                showConfirmButton: false
            });

        } catch (err: any) {
            console.error("Error parseando DNI:", err);
            Swal.fire("Error", "No se pudieron leer los datos del DNI. Intente nuevamente.", "error");
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
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4">
                    <div className="w-full max-w-lg bg-black rounded-lg overflow-hidden relative border border-gray-700 shadow-2xl">

                        {/* Header */}
                        <div className="flex justify-between items-center p-3 bg-gray-900 border-b border-gray-800 absolute top-0 w-full z-10 opacity-90">
                            <h3 className="text-white text-sm font-medium">Escaneando DNI (PDF417)</h3>
                            <button
                                onClick={stopScanning}
                                className="text-gray-300 hover:text-white bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Video Container */}
                        <div className="relative w-full aspect-video bg-black mt-12 mb-12">
                            {/* Nota: transform-none evita el efecto espejo */}
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover transform-none"
                                muted
                                playsInline
                            />

                            {/* Guía visual de escaneo */}
                            <div className="absolute inset-0 pointer-events-none border-2 border-celeste/30 rounded-lg m-8 flex items-center justify-center">
                                <div className="w-full h-0.5 bg-red-500/50 absolute top-1/2 left-0 animate-pulse"></div>
                                <p className="text-white/50 text-xs absolute bottom-2">Alinee el código PDF417 aquí</p>
                            </div>
                        </div>

                        {/* Footer / Instrucciones */}
                        <div className="p-4 bg-gray-900 text-center border-t border-gray-800 absolute bottom-0 w-full">
                            <p className="text-gray-300 text-sm mb-2">
                                Enfoque el código de barras del DNI.
                            </p>
                            {error && (
                                <p className="text-red-400 text-xs font-bold mb-2 bg-red-900/20 p-2 rounded">
                                    {error}
                                </p>
                            )}
                            <button
                                onClick={stopScanning}
                                className="mt-1 px-6 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition border border-gray-600"
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
