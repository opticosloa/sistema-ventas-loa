import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogoPantallaCarga } from "./";
import { useAuthStore } from "../../hooks";

export const Home = () => {
    const navigate = useNavigate();
    const { status } = useAuthStore(); // Obtenemos el estado de autenticación

    // Lógica para saltear la pantalla si ya está logueado
    useEffect(() => {
        if (status === 'authenticated') {
            // Aquí puedes decidir a qué ruta enviarlo por defecto 
            // o dejar que el AppRouter maneje la redirección de RoleGuard
            navigate("/admin");
        }
    }, [status, navigate]);

    const handleClick = () => {
        navigate("/login");
    };

    return (
        <div
            className="flex h-screen w-full items-center justify-center cursor-pointer animate-fadeIn"
            style={{ backgroundColor: '#E0F2FE' }} // Aquí usa el HEX de tu "celeste" (ej: sky-100)
            onClick={handleClick}
        >
            <div className="hover:scale-110 transition-transform duration-500 ease-in-out">
                <LogoPantallaCarga />
            </div>
        </div>
    );
};