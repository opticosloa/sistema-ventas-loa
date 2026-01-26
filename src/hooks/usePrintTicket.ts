import { useState, useCallback } from 'react';
import Swal from 'sweetalert2';

export const usePrintTicket = () => {
    const [isPrinting, setIsPrinting] = useState(false);

    const printTicket = useCallback(async (pdfUrl: string) => {
        setIsPrinting(true);
        const serverUrl = localStorage.getItem('localPrintServerUrl');
        const printerName = localStorage.getItem('localPrinterName');

        // Logic: If NO configuration, Fallback immediately
        if (!serverUrl) {
            console.log("No Local Print Agent configured. Falling back to window.open");
            window.open(pdfUrl, '_blank');
            setIsPrinting(false);
            return;
        }

        try {
            // Attempt to send to Local Agent
            // Ensure serverUrl doesn't have trailing slash if we append
            const baseUrl = serverUrl.replace(/\/$/, "");

            const response = await fetch(`${baseUrl}/print`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: pdfUrl,
                    printer: printerName // Optional, blank means default
                })
            });

            if (!response.ok) {
                // Determine if it was a connection error or server error
                throw new Error(`Agent returned status ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Imprimiendo...',
                    text: `Enviado a ${printerName || 'Impresora Predeterminada'}`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error(data.error || 'Unknown error from agent');
            }

        } catch (error) {
            console.error("Local Print Agent failed:", error);
            // Fallback
            Swal.fire({
                title: 'Agente de Impresión no disponible',
                text: 'Abriendo PDF para impresión manual...',
                icon: 'info',
                timer: 2000,
                showConfirmButton: false
            });
            window.open(pdfUrl, '_blank');
        } finally {
            setIsPrinting(false);
        }
    }, []);

    return { printTicket, isPrinting };
};
