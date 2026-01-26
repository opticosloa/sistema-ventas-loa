import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Printer, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export const LocalPrintConfig: React.FC = () => {
    const [serverUrl, setServerUrl] = useState('');
    const [printers, setPrinters] = useState<{ deviceId: string, name: string }[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'OK' | 'ERROR'>('IDLE');

    useEffect(() => {
        const savedUrl = localStorage.getItem('localPrintServerUrl') || 'http://localhost:4000';
        const savedPrinter = localStorage.getItem('localPrinterName') || '';
        setServerUrl(savedUrl);
        setSelectedPrinter(savedPrinter);
    }, []);

    const handleSave = () => {
        localStorage.setItem('localPrintServerUrl', serverUrl);
        if (selectedPrinter) {
            localStorage.setItem('localPrinterName', selectedPrinter);
        }
        Swal.fire('Guardado', 'Configuración de impresión guardada', 'success');
    };

    const fetchPrinters = async () => {
        if (!serverUrl) return;
        setLoading(true);
        setStatus('IDLE');
        try {
            // Test connection and get printers
            const response = await fetch(`${serverUrl}/printers`);
            const data = await response.json();

            if (data.success && Array.isArray(data.printers)) {
                // Map array of strings or objects? pdf-to-printer returns array of objects usually or strings? 
                // Documentation says: getPrinters() returns Promise<Printer[]>. Printer with { deviceId, name }.
                // But let's handle if it returns strings too.
                const mapped = data.printers.map((p: any) => {
                    const name = typeof p === 'string' ? p : p.name;
                    return { deviceId: p.deviceId || name, name: name };
                });
                setPrinters(mapped);
                setStatus('OK');

                // Keep selected if exists
                const saved = localStorage.getItem('localPrinterName');
                if (saved && mapped.find((p: any) => p.name === saved)) {
                    setSelectedPrinter(saved);
                } else if (mapped.length > 0) {
                    setSelectedPrinter(mapped[0].name);
                }
            } else {
                setStatus('ERROR');
                Swal.fire('Error', 'El agente respondió pero no devolvió impresoras.', 'error');
            }
        } catch (error) {
            console.error(error);
            setStatus('ERROR');
            Swal.fire('Error', 'No se pudo conectar con el Agente de Impresión. Verifique que esté corriendo.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 mt-4 border border-slate-700 shadow-xl mb-6">
            <div className="flex items-center gap-3 mb-4">
                <Printer className="text-cyan-400" size={24} />
                <h2 className="text-xl font-semibold text-white">Configuración de Impresión Local</h2>
            </div>

            <p className="text-slate-400 text-sm mb-6">
                Conecte con el "Local Print Agent" para imprimir tickets directamente en impresoras de esta PC/Red.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Server URL Input */}
                <div>
                    <label className="block text-sm text-slate-300 mb-1">URL del Agente Local</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            placeholder="Ej: http://localhost:4000"
                        />
                        <button
                            onClick={fetchPrinters}
                            disabled={loading}
                            className={`px-4 rounded-lg font-bold text-white transition-colors flex items-center gap-2 ${status === 'OK' ? 'bg-green-600 hover:bg-green-500' :
                                status === 'ERROR' ? 'bg-red-600 hover:bg-red-500' :
                                    'bg-cyan-600 hover:bg-cyan-500'
                                }`}
                            title="Probar Conexión y Listar Impresoras"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={20} /> :
                                status === 'OK' ? <CheckCircle size={20} /> :
                                    status === 'ERROR' ? <XCircle size={20} /> :
                                        <RefreshCw size={20} />
                            }
                        </button>
                    </div>
                    {status === 'OK' && <span className="text-xs text-green-400 mt-1 block">Conexión Exitosa</span>}
                    {status === 'ERROR' && <span className="text-xs text-red-400 mt-1 block">Fallo la conexión</span>}
                </div>

                {/* Printer Selection */}
                <div>
                    <label className="block text-sm text-slate-300 mb-1">Impresora Predeterminada</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedPrinter}
                            onChange={(e) => setSelectedPrinter(e.target.value)}
                            disabled={printers.length === 0}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="">-- Seleccionar Impresora --</option>
                            {printers.map((p, idx) => (
                                <option key={idx} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleSave}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold p-3 rounded-lg transition-colors"
                            title="Guardar Configuración"
                        >
                            Guardar
                        </button>
                    </div>
                    {printers.length === 0 && status !== 'ERROR' && (
                        <span className="text-xs text-slate-500 mt-1 block">Pulse el botón de actualizar para cargar impresoras.</span>
                    )}
                </div>
            </div>
        </div>
    );
};
