import { NavLink, useNavigate } from "react-router-dom"; // Cambiamos a NavLink
import { useAppDispatch, useAppSelector, useUiStore } from "../../hooks";
import { startLogout } from "../../store";

export const SideBar = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSideBarOpen, toggleSideBar } = useUiStore();
  const { uid, role } = useAppSelector((state: any) => state.auth);

  const handlerLogout = async () => {
    if (uid) {
      await dispatch(startLogout()); // Esperamos a que el logout termine
    }
    toggleSideBar();
    navigate('/login');
  };

  // Clase para los links activos/inactivos
  const linkClass = "block py-2 px-4 rounded-lg hover:bg-celeste transition-colors";

  return (
    <>
      {/* Overlay */}
      {isSideBarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" // Agregué un poco de opacidad para notar el click
          onClick={toggleSideBar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 right-0 h-full w-64 bg-azul text-blanco z-50 shadow-lg transform
          transition-transform duration-300 ease-in-out
          ${isSideBarOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-celeste">
          <h2 className="text-lg font-bold">Menú</h2>
          <button onClick={toggleSideBar} className="text-blanco hover:text-celeste">✕</button>
        </div>

        {/* Links con NavLink para evitar recargas */}
        <nav className="flex flex-col p-4 space-y-2">
          <NavLink
            to="/taller/lista"
            className={linkClass}
            onClick={toggleSideBar}
          >
            Taller
          </NavLink>
          <NavLink
            to="/admin"
            className={linkClass}
            onClick={toggleSideBar}
          >
            Admin
          </NavLink>
          <NavLink
            to="/empleado"
            className={linkClass}
            onClick={toggleSideBar}
          >
            Empleado
          </NavLink>

          {/* Currency Config - Restricted to ADMIN/SUPERADMIN */}
          {['ADMIN', 'SUPERADMIN'].includes(role) && (
            <NavLink
              to="/admin/configuracion"
              className={linkClass}
              onClick={toggleSideBar}
            >
              Configuración de Divisas
            </NavLink>
          )}
        </nav>

        <div className="mt-auto p-4 border-t border-celeste/30">
          <button
            className="w-full text-left py-2 px-4 text-red-300 hover:text-red-100 transition-colors"
            onClick={handlerLogout}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};