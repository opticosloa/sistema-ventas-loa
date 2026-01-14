import { useState } from 'react';
import { NavLink, useNavigate } from "react-router-dom"; // Cambiamos a NavLink
import { useAppDispatch, useAppSelector, useUiStore } from "../../hooks";
import { startLogout } from "../../store";
import { ProfileEditModal } from "./ProfileEditModal";

export const SideBar = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSideBarOpen, toggleSideBar } = useUiStore();
  const { uid, role } = useAppSelector((state: any) => state.auth);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
          {/* Rutas Principales */}
          <NavLink to="/taller/lista" className={linkClass} onClick={toggleSideBar}>Taller</NavLink>
          <NavLink to="/admin" className={linkClass} onClick={toggleSideBar}>Admin</NavLink>
          <NavLink to="/empleado" className={linkClass} onClick={toggleSideBar}>Empleado</NavLink>

          <div className="border-b border-celeste/20 my-2"></div>

          {/* Cierre de Caja - Disponible para quienes venden */}
          {['ADMIN', 'SUPERADMIN', 'EMPLEADO'].includes(role) && (
            <NavLink
              to={role === 'EMPLEADO' ? "/empleado/cierre-caja" : "/admin/cierre-caja"}
              className={linkClass}
              onClick={toggleSideBar}
            >
              Cierre de Caja
            </NavLink>
          )}

          {/* Configuración de Divisas - Solo Admins */}
          {['ADMIN', 'SUPERADMIN'].includes(role) && (
            <NavLink to="/admin/configuracion" className={linkClass} onClick={toggleSideBar}>
              Configuración de Divisas
            </NavLink>
          )}

          <div className="border-b border-celeste/20 my-2"></div>

          {/* Perfil Usuario (Mobile) */}
          <button
            className="w-full text-left py-2 px-4 rounded-lg hover:bg-celeste transition-colors flex items-center gap-2"
            onClick={() => {
              setShowProfileModal(true);
              // Do not close sidebar immediately so user understands context, or maybe close it?
              // Usually better to keep sidebar or handle via modal overlay.
              // Let's close sidebar if we want full focus on modal, but modal has high z-index
              toggleSideBar();
            }}
          >
            Perfil Usuario
          </button>

          <div className="mt-auto pt-4 border-t border-celeste/30">
            <button
              className="w-full text-left py-2 px-4 rounded-lg hover:bg-celeste transition-colors flex items-center gap-2 text-red-300 hover:text-red-100 transition-colors"
              onClick={handlerLogout}
            >
              Cerrar Sesión
            </button>
          </div>
        </nav>


      </div>

      {showProfileModal && (
        <ProfileEditModal onClose={() => setShowProfileModal(false)} />
      )}
    </>
  );
};