import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string, decodedResult: any) => void;
    onScanFailure?: (error: any) => void;
    onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({
    onScanSuccess,
    onScanFailure,
    onClose
}) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                videoConstraints: { facingMode: "environment" }
            },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, (error) => {
            if (onScanFailure) onScanFailure(error);
            // console.warn(error); // Optional: suppress default console spam
        });

        // Cleanup function
        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5-qrcode scanner. ", error);
            });
        };
    }, []); // Empty dependency array ensures this runs once on mount

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-white p-4 rounded-lg w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 font-bold"
                >
                    X
                </button>
                <h3 className="text-lg font-bold mb-4 text-center text-black">Escanear Código</h3>
                <div id="reader"></div>
            </div>
        </div>
    );
};
