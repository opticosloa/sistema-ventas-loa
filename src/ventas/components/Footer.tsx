

export const Footer = () => {
  return (
    <footer className="absolute inset-x-0 bottom-0 w-full bg-azul text-gray-300 py-6 mt-10">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">

        {/* Nombre o marca */}
        <span className="text-sm md:text-base font-semibold">
          © {new Date().getFullYear()} Laboratorio Óptico Acuña. Todos los derechos reservados.
        </span>

        {/* Links de navegación */}
        <div className="flex space-x-4 mt-3 md:mt-0">
          <a href="#" className="hover:text-white text-sm">Política de Privacidad</a>
          <a href="#" className="hover:text-white text-sm">Términos y Condiciones</a>
          <a href="#" className="hover:text-white text-sm">Reportes</a>
        </div>
      </div>
    </footer>
  );
};
