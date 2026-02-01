import { useEffect, useState } from "react";
import LOAApi from "../../api/LOAApi";
import { usePayment } from "../../hooks";
import { BotonEntregarTicket } from "../components/BotonEntregarTicket";
import { useBranch } from "../../context/BranchContext";

interface Props {
    ventaId: string;
}

type EstadoVenta = "PENDIENTE" | "PAGADA";

export const VentaDetallePage = ({ ventaId }: Props) => {
    const { payWithMercadoPago, loading, error } = usePayment();
    const { currentBranch } = useBranch();

    const [total, setTotal] = useState<number>(0);
    const [estado, setEstado] = useState<EstadoVenta | null>(null);
    const [loadingVenta, setLoadingVenta] = useState(true);

    useEffect(() => {
        LOAApi.get(`/api/ventas/${ventaId}`)
            .then(({ data }) => {
                setTotal(Number(data.result.total));
                setEstado(data.result.estado);
            })
            .catch(console.error)
            .finally(() => setLoadingVenta(false));
    }, [ventaId]);

    if (loadingVenta) {
        return <p>Cargando venta…</p>;
    }

    return (
        <div className="p-4 border rounded-lg space-y-4">
            <h2 className="text-xl font-semibold">
                Venta #{ventaId}
            </h2>

            <div>
                <strong>Total:</strong> ${total.toFixed(2)}
            </div>

            {/* 🔹 ESTADO DE LA VENTA */}
            {estado === "PENDIENTE" && (
                <div className="p-3 rounded bg-yellow-100 text-yellow-800">
                    Pago parcial - saldo pendiente
                </div>
            )}

            {estado === "PAGADA" && (
                <div className="p-3 rounded bg-green-100 text-green-800">
                    Venta cerrada - ticket listo
                </div>
            )}

            {/* 🔹 ACCIONES */}
            {estado === "PENDIENTE" && (
                <button
                    onClick={() => payWithMercadoPago(ventaId, total, currentBranch?.sucursal_id || '')}
                    disabled={loading}
                    className="
            bg-blue-600
            text-white
            px-6
            py-3
            rounded-lg
            hover:bg-blue-700
            disabled:opacity-50
          "
                >
                    {loading ? "Redirigiendo…" : "Pagar con Mercado Pago"}
                </button>
            )}

            {estado === "PAGADA" && (
                <BotonEntregarTicket ticketId={ventaId} estado={estado} />
            )}

            {error && (
                <p className="text-red-500">
                    {error}
                </p>
            )}


        </div>
    );
};
