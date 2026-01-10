import { Outlet, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks';


export const Dashboard = () => {
  const navigate = useNavigate();

  const { nombre, role } = useAppSelector((state) => state.auth);

  return (
    <main className="w-screen h-scw-screen mx-auto bg-gradient-to-r from-azul to-celeste">
      <div className="flex flex-col w-full  px-8 py-6 shadow-lg">

        <h1 className="text-3xl text-blanco font-semibold mb-6 text-center">Bienvenido {nombre}</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <button
            className="bg-gray-100 border border-gray-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-crema hover:opacity-90 transition"
            onClick={() => navigate("/admin/historial")}
          >
            Historial de tickets
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
                className="bg-gray-100 border-2 border-purple-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-purple-100/50 hover:opacity-90 transition"
                onClick={() => navigate("/admin/productos/nuevo")}
              >
                📦 Alta Producto
              </button>
              <button
                className="bg-gray-100 border-2 border-purple-300 shadow-sm rounded-lg h-28 flex items-center justify-center text-lg font-medium hover:bg-purple-100/50 hover:opacity-90 transition"
                onClick={() => navigate("/admin/cristales/nuevo")}
              >
                👁️ Alta Cristal
              </button>
            </>
          )}
        </div>

        <div className="mt-8">
          <Outlet />
        </div>
      </div>
    </main>
  );
};
