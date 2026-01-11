import React, { useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, Trash2, Image as ImageIcon, RotateCw } from 'lucide-react';

interface PrescriptionCaptureProps {
    file: File | null;
    setFile: (file: File | null) => void;
}

export const PrescriptionCapture: React.FC<PrescriptionCaptureProps> = ({ file, setFile }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [compressing, setCompressing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Update preview when file changes
    React.useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [file]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const imageFile = event.target.files?.[0];
        if (!imageFile) return;

        setCompressing(true);

        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
            fileType: 'image/jpeg'
        };

        try {
            const compressedFile = await imageCompression(imageFile, options);
            // Create a new File object with a clean name to avoid issues
            const renamedFile = new File([compressedFile], `receta_${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });

            setFile(renamedFile);
        } catch (error) {
            console.error('Error compressing image:', error);
            alert('Error al procesar la imagen. Intente nuevamente.');
        } finally {
            setCompressing(false);
            // Reset input value to allow selecting the same file again if needed
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleTrigger = () => {
        inputRef.current?.click();
    };

    const handleRemove = () => {
        setFile(null);
    };

    return (
        <section className="bg-white/5 border border-white/60 rounded-xl p-4 my-4 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4">

                {/* Controls Area */}
                <div className="flex-1 w-full sm:w-auto">
                    <h3 className="text-lg text-white font-medium mb-3 flex items-center gap-2">
                        <ImageIcon className="text-cyan-400" size={20} />
                        Foto de Receta
                    </h3>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {!file && (
                        <button
                            type="button"
                            onClick={handleTrigger}
                            disabled={compressing}
                            className={`
                                w-full sm:w-auto flex items-center justify-center gap-2 
                                px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95
                                ${compressing
                                    ? 'bg-gray-500 cursor-wait'
                                    : 'bg-cyan-500 hover:bg-cyan-600 border border-cyan-400/50'
                                }
                            `}
                        >
                            {compressing ? (
                                <>
                                    <RotateCw className="animate-spin" size={20} />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Camera size={20} />
                                    Tomar Foto
                                </>
                            )}
                        </button>
                    )}

                    {file && (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors border border-red-500/50"
                            >
                                <Trash2 size={18} />
                                Eliminar
                            </button>
                            <button
                                type="button"
                                onClick={handleTrigger}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/30"
                            >
                                <RotateCw size={18} />
                                Repetir
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview Area */}
                {previewUrl && (
                    <div className="relative group shrink-0">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden border-2 border-cyan-500/50 shadow-black/50 shadow-lg bg-black/40">
                            <img
                                src={previewUrl}
                                alt="Vista previa receta"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute top-1 right-1">
                            <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow">
                                LISTO
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {file && (
                <p className="text-xs text-white/50 mt-2">
                    Imagen comprimida: {(file.size / 1024).toFixed(1)} KB
                </p>
            )}
        </section>
    );
};
