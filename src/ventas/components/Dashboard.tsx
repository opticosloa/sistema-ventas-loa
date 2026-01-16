import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks';
import { ScrollToTopButton } from '../../components/ui/ScrollToTopButton';


export const Dashboard = () => {
  const navigate = useNavigate();
  const { nombre, role } = useAppSelector((state) => state.auth);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  return (
    <main className="w-screen h-scw-screen mx-auto bg-gradient-to-r from-azul to-celeste min-h-screen">
      <div className="flex flex-col w-full  px-8 py-6 shadow-lg">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl text-blanco font-semibold text-center">Bienvenido {nombre}</h1>
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
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
              onClick={() => navigate("/admin/nueva-venta")}
            >
              Nueva venta
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
              onClick={() => navigate("/admin/clientes")}
            >
              Clientes
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
              onClick={() => navigate("/admin/empleados")}
            >
              Empleados
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
              onClick={() => navigate("/admin/taller")}
            >
              Taller
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
              onClick={() => navigate("/admin/estadisticas")}
            >
              Estadísticas
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
              onClick={() => navigate("/admin/stock")}
            >
              Stock
            </button>

            <button
              className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
              onClick={() => navigate("/admin/devoluciones")}
            >
              Devoluciones
            </button>

            {role === 'SUPERADMIN' && (
              <>
                <button
                  className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
                  onClick={() => navigate("/admin/productos/nuevo")}
                >
                  Alta Producto
                </button>
                <button
                  className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
                  onClick={() => navigate("/admin/cristales/nuevo")}
                >
                  Alta Cristal
                </button>
              </>
            )}
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
