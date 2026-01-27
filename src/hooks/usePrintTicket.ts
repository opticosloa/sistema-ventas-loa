import { useState, useCallback } from 'react';
import Swal from 'sweetalert2';

export const usePrintTicket = () => {
    const [isPrinting, setIsPrinting] = useState(false);

    const printTicket = useCallback(async (pdfUrl: string) => {
        setIsPrinting(true);
        const serverUrl = localStorage.getItem('localPrintServerUrl');
        const printerName = localStorage.getItem('localPrinterName');

        // 1. SIEMPRE abrir el PDF (Solicitud usuario: "que siempre aparezca el pdf")
        // Intentamos abrirlo inmediatamente para evitar bloqueos de pop-up si es evento de usuario.
        // Si es useEffect, podría bloquearse, pero mantenemos la lógica anterior de intentar.
        let pdfWindow: Window | null = null;
        try {
            pdfWindow = window.open(pdfUrl, '_blank');
        } catch (e) {
            console.error("Popup blocked?", e);
        }

        // Logic: If NO configuration, process ends here (PDF already opening)
        if (!serverUrl) {
            console.log("No Local Print Agent configured.");
            setIsPrinting(false);
            return;
        }

        try {
            // Attempt to send to Local Agent with Timeout
            const baseUrl = serverUrl.replace(/\/$/, "");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 Segundos

            const response = await fetch(`${baseUrl}/print`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: pdfUrl,
                    printer: printerName
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Agent returned status ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Enviado a Impresora',
                    text: `Imprimiendo en ${printerName || 'Predeterminada'}...`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
            } else {
                throw new Error(data.error || 'Unknown error');
            }

        } catch (error: any) {
            console.error("Local Print Agent failed:", error);

            // Si falló o timeout
            let msg = 'No se pudo contactar al agente de impresión.';
            if (error.name === 'AbortError') {
                msg = 'Tiempo de espera agotado (4s). Imprimiendo manual...';
            }

            Swal.fire({
                title: 'Info Impresión',
                text: msg + ' El PDF se abrió en otra pestaña.',
                icon: 'info',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });

            // Re-intento de abrir si falló el primero (opcional, pero seguro)
            if (!pdfWindow || pdfWindow.closed) {
                window.open(pdfUrl, '_blank');
            }
        } finally {
            setIsPrinting(false);
        }
    }, []);

    return { printTicket, isPrinting };
};
