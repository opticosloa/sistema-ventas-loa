import { useState } from "react";
import Swal from 'sweetalert2';
import LOAApi from "../../api/LOAApi";
import { useNavigate } from "react-router-dom";

interface Props {
    ticketId: string;
    estado: 'PENDIENTE' | 'LISTO' | 'ENTREGADO' | 'PAGADA';
}

export const BotonEntregarTicket = ({ ticketId, estado }: Props) => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    loading;
    if (estado !== 'LISTO' && estado !== 'PAGADA') return null;

    const entregar = async () => {
        const result = await Swal.fire({
            title: '¿Confirmar entrega?',
            text: "El ticket se marcará como ENTREGADO",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, entregar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            await LOAApi.post(`/api/ventas/${ticketId}/entregar`);
            // window.location.reload(); // o refetch - Swapped reload for better React practice if possible, but keeping logic
            Swal.fire(
                'Entregado!',
                'El ticket ha sido entregado.',
                'success'
            ).then(() => {
                navigate('/ventas');
                window.location.reload();
            });

        } catch (e) {
            Swal.fire('Error', 'Error al entregar el ticket', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={entregar}
            className="btn-primary"
        >
            Entregar / Finalizar ticket
        </button>

    );
};
