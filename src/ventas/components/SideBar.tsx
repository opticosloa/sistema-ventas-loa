import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector, useUiStore } from "../../hooks";
import { startLogout } from "../../store";
import { ProfileEditModal } from "./ProfileEditModal";
import { navigationConfig, type NavItem } from '../constants/navigation';
import { LogOut, User } from 'lucide-react';

export const SideBar = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSideBarOpen, toggleSideBar } = useUiStore();
  const { uid, role, nombre, apellido } = useAppSelector((state: any) => state.auth);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handlerLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      toggleSideBar(); // Close immediately for UI feedback

      if (uid) {
        await dispatch(startLogout());
      }

      navigate('/login', { replace: true });
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback
      navigate('/login', { replace: true });
    }
  };

  // Filter and group navigation items
  const groupedNavItems = useMemo(() => {
    if (!role) return {};

    const allowedItems = navigationConfig.filter(item =>
      item.requiredRoles.includes(role)
    );

    const groups: Record<string, NavItem[]> = {};

    // Defined order for categories
    const categoryOrder = ['Ventas', 'Inventario', 'Administración', 'Superadmin', 'Configuración'];

    allowedItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    // Sort categories based on defined order
    const sortedGroups: Record<string, NavItem[]> = {};
    categoryOrder.forEach(cat => {
      if (groups[cat]) {
        sortedGroups[cat] = groups[cat];
      }
    });

    return sortedGroups;
  }, [role]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${isActive
      ? "bg-white/10 text-white"
      : "text-blue-100 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      {/* Overlay */}
      {isSideBarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={toggleSideBar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 right-0 h-full w-72 bg-gradient-to-b from-azul to-slate-900 text-white z-50 shadow-2xl transform
          transition-transform duration-300 ease-out
          ${isSideBarOpen ? "translate-x-0" : "translate-x-full"}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-wide">Menú</h2>
            <span className="text-xs text-blue-200 mt-1 uppercase tracking-wider font-semibold">{role}</span>
          </div>
          <button
            onClick={toggleSideBar}
            className="p-2 rounded-full hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {/* Navigation Content - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {Object.entries(groupedNavItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-widest mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={linkClass}
                    onClick={toggleSideBar}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/10 bg-black/20">

          <button
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-blue-100 hover:text-white transition-colors flex items-center gap-3 mb-2"
            onClick={() => {
              setShowProfileModal(true);
              // toggleSideBar(); // Optional: keep open or close
            }}
          >
            <div className="p-1 bg-blue-500/20 rounded-full">
              <User size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{nombre} {apellido}</span>
              <span className="text-xs text-blue-300">Ver Perfil</span>
            </div>
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-500/10 text-red-300 hover:text-red-200 transition-colors flex items-center gap-3 group"
            onClick={handlerLogout}
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {showProfileModal && (
        <ProfileEditModal onClose={() => setShowProfileModal(false)} />
      )}
    </>
  );
};