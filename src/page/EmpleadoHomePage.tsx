import { useState } from 'react';
import { useNavigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../hooks";
import { ScrollToTopButton } from "../components/ui/ScrollToTopButton";
import { useBranch } from '../context/BranchContext';

export const EmpleadoHomePage = () => {
  const navigate = useNavigate();
  const { nombre } = useAppSelector(state => state.auth);
  const { currentBranch } = useBranch();
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  return (
    <main className="flex ">
      <div className="flex flex-col w-full bg-gradient-to-r from-azul to-celeste px-8 pt-8 shadow-lg min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-blanco">
            Bienvenido {nombre}
            <span className="text-xl ml-3 opacity-90 font-normal border-l pl-3 border-white/40">
              {currentBranch?.nombre}
            </span>
          </h1>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            title={isMenuOpen ? "Plegar menú" : "Desplegar menú"}
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 fade-in">
            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-gray-200 transition"
              onClick={() => navigate("/empleado/nueva-venta")}
            >
              Nueva venta
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-gray-200 transition"
              onClick={() => navigate("/empleado/nueva-venta/pago")}
            >
              Pagos
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-gray-200 transition"
              onClick={() => navigate("/empleado/stock")}
            >
              Stock
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-gray-200 transition"
              onClick={() => navigate("/empleado/clientes")}
            >
              Clientes
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-gray-200 transition"
              onClick={() => navigate("/empleado/devoluciones")}
            >
              Devoluciones
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-gray-200 transition"
              onClick={() => navigate("/empleado/entregas")}
            >
              Entregas
            </button>
          </div>
        )}

        <div className="mt-8">
          <Outlet />
        </div>

        <ScrollToTopButton />
      </div>
    </main>

  );
};
