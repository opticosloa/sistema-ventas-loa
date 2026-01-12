import { useNavigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../hooks";

export const EmpleadoHomePage = () => {
  const navigate = useNavigate();
  const { nombre } = useAppSelector(state => state.auth);

  return (
    <main className="flex ">
      <div className="flex flex-col w-full bg-gradient-to-r from-azul to-celeste px-8 pt-8 shadow-lg">
        <h1 className="text-3xl font-semibold mb-6 text-blanco">Bienvenido {nombre} </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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

        <div className="mt-8">
          <Outlet />
        </div>
      </div>
    </main>

  );
};
