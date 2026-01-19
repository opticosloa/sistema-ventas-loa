import React from 'react';
import Swal from 'sweetalert2';
import { QRCodeSVG } from 'qrcode.react';

interface MercadoPagoModalsProps {
    mpModalOpen: boolean;
    setMpModalOpen: (val: boolean) => void;
    mpAmount: number;
    pointDevices: any[];
    selectedDeviceId: string;
    setSelectedDeviceId: (val: string) => void;
    startMpQrFlow: (amount: number) => void;
    startMpPointFlow: (amount: number, deviceId: string) => void;

    asyncPaymentStatus: 'IDLE' | 'WAITING_POINT' | 'SHOWING_QR';
    qrData: string | null;
    pointStatus: string;
    setAsyncPaymentStatus: (status: 'IDLE' | 'WAITING_POINT' | 'SHOWING_QR') => void;
}

export const MercadoPagoModals: React.FC<MercadoPagoModalsProps> = ({
    mpModalOpen,
    setMpModalOpen,
    mpAmount,
    pointDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    startMpQrFlow,
    startMpPointFlow,

    asyncPaymentStatus,
    qrData,
    pointStatus,
    setAsyncPaymentStatus,
}) => {
    return (
        <>
            {/* MP Modal */}
            {mpModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full text-center">
                        <h3 className="text-xl font-bold mb-4 text-white">Mercado Pago</h3>
                        <p className="mb-6 text-gray-300">Monto: ${mpAmount.toLocaleString()}</p>

                        {/* Device Selector for Point */}
                        <div className="mb-4 text-left">
                            <label className="block text-sm text-gray-400 mb-1">Seleccionar Terminal Point:</label>
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                className="input w-full text-sm bg-gray-900"
                                disabled={pointDevices.length === 0}
                            >
                                {pointDevices.length === 0 ? (
                                    <option value="">Cargando / No hay dispositivos...</option>
                                ) : (
                                    pointDevices.map((device: any) => (
                                        <option key={device.id} value={device.id}>
                                            {device.name || `Terminal ${device.id.slice(-6)}`}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="flex gap-4 justify-center mb-6">
                            <button
                                onClick={() => {
                                    setMpModalOpen(false);
                                    startMpQrFlow(mpAmount);

                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg flex flex-col items-center gap-2"
                            >
                                <span className="text-2xl">🖥️</span>
                                <span className="text-sm font-bold">QR Pantalla</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (!selectedDeviceId) return Swal.fire("Info", "Seleccione una terminal", "info");
                                    setMpModalOpen(false);
                                    startMpPointFlow(mpAmount, selectedDeviceId);

                                }}
                                disabled={pointDevices.length === 0 || !selectedDeviceId}
                                className={`flex-1 py-3 rounded-lg flex flex-col items-center gap-2 ${pointDevices.length === 0 || !selectedDeviceId
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-cyan-600 hover:bg-cyan-500'
                                    }`}
                            >
                                <span className="text-2xl">💳</span>
                                <span className="text-sm font-bold">Terminal Point</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setMpModalOpen(false)}
                            className="text-gray-400 underline hover:text-white"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Async Status Modal */}
            {asyncPaymentStatus !== 'IDLE' && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white text-black p-8 rounded-xl max-w-md w-full flex flex-col items-center text-center">
                        {asyncPaymentStatus === 'SHOWING_QR' && qrData && (
                            <>
                                <h3 className="text-2xl font-bold mb-4">Escaneá el QR</h3>
                                <div className="p-4 border-2 border-dashed border-gray-300 rounded mb-4">
                                    <QRCodeSVG value={qrData} size={256} />
                                </div>
                                <p className="text-sm text-gray-500 mb-4">Escanea desde la App de Mercado Pago</p>
                                <div className="flex items-center gap-2 animate-pulse text-blue-600 font-medium">
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    Esperando confirmación...
                                </div>
                            </>
                        )}
                        {asyncPaymentStatus === 'WAITING_POINT' && (
                            <>
                                <div className="text-6xl mb-4">💳</div>
                                <h3 className="text-2xl font-bold mb-2">Procesando en Terminal</h3>
                                <p className="text-gray-600 mb-6">{pointStatus || "Siga las instrucciones en el dispositivo"}</p>
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </>
                        )}
                        <button
                            onClick={() => setAsyncPaymentStatus('IDLE')}
                            className="mt-8 text-sm text-gray-500 hover:text-red-500 underline"
                        >
                            Cerrar / Cancelar (No cancela en terminal)
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
