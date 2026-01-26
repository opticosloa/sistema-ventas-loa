import React, { useMemo, useState, useEffect } from "react";
import Swal from 'sweetalert2';
import type { Producto } from "../../types/Producto";
import LOAApi from '../../api/LOAApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from "qrcode.react";
import { RefreshButton } from "../../components/ui/RefreshButton";
import { getCristalStock } from "../../services/stock.api";
import type { CrystalMaterial } from "../../services/crystals.api";
import { getMaterials } from "../../services/crystals.api";

const ITEMS_PER_PAGE = 25;

const statusBadge = (stock: number) => {
  if (stock <= 2) return "bg-red-100 text-red-800";
  if (stock <= 10) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
};

export const ConsultaStock: React.FC = () => {
  const queryClient = useQueryClient();

  // 2. Local State (Moved up for dependencies)
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<"" | Producto["tipo"] | "ALL">("");
  const [sortBy, setSortBy] = useState<"stock-desc" | "stock-asc" | "name-asc">("stock-desc");
  const [page, setPage] = useState(1);
  const [activeInfoTab, setActiveInfoTab] = useState<'products' | 'crystals'>('products');
  const [crystalFilters, setCrystalFilters] = useState({
    esferaFrom: '', esferaTo: '',
    cilindroFrom: '', cilindroTo: '',
    material: 'ALL', tratamiento: 'ALL'
  });
  const [crystalSort, setCrystalSort] = useState<'stock-asc' | 'stock-desc'>('stock-asc');
  const [currencyMode, setCurrencyMode] = useState<'ARS' | 'USD'>('ARS');

  // 1. Loading State & Data
  const { data: products = [], isLoading, isSuccess } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await LOAApi.get<{ success: boolean; result: any }>('/api/products');
      const listaProductos = data.result?.rows || data.result;
      return Array.isArray(listaProductos) ? listaProductos : [];
    }
  });


  // Fetch Dolar
  const { data: dolarRate = 0 } = useQuery({
    queryKey: ['dolarRate'],
    queryFn: async () => {
      const { data } = await LOAApi.get<{ success: boolean; result: any }>('/api/currency/rate');
      return data.result.rate || 0;
    }
  });

  // Fetch Materials
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: getMaterials
  });

  const { data: crystals = [], isLoading: isLoadingCrystals, refetch: refetchCrystals } = useQuery({
    queryKey: ['crystals', crystalFilters],
    queryFn: async () => {
      // If we are not in crystal tab, we might skip or not.
      // But user says: "Al cambiar los filtros o al cargar la pestaña"
      // We will rely on queryKey dependencies for "Al cambiar los filtros".
      // We also need refetchOnMount or similar for "al cargar la pestaña" (default behavior).
      return await getCristalStock({
        esferaFrom: crystalFilters.esferaFrom,
        esferaTo: crystalFilters.esferaTo,
        cilindroFrom: crystalFilters.cilindroFrom,
        cilindroTo: crystalFilters.cilindroTo,
        material: crystalFilters.material
      });
    },
    enabled: activeInfoTab === 'crystals' // Only fetch when tab is active
  });

  useEffect(() => {
    if (isSuccess && products.length === 0) {
      // alert("No se encontraron productos (la tabla está vacía)."); // Annoying on refresh if empty
    }
  }, [isSuccess, products]);


  // Modals
  const [qrModal, setQrModal] = useState<{ open: boolean, value: string, title: string }>({ open: false, value: '', title: '' });
  const [reduceStockModal, setReduceStockModal] = useState<{ open: boolean, product: Producto | null }>({ open: false, product: null });
  const [reduceAmount, setReduceAmount] = useState<string>('1');

  // Filter Logic
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...products];

    // Filter Category
    if (categoria && categoria !== "ALL") {
      list = list.filter((p: Producto) => p.tipo === categoria);
    }

    // Search
    if (q) {
      list = list.filter(
        (p: Producto) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigo_qr && p.codigo_qr.toLowerCase().includes(q)) ||
          p.ubicacion.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      // 1. Primary Sort: Active first
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }

      // 2. Secondary Sort
      if (sortBy === "stock-desc") return b.stock - a.stock;
      if (sortBy === "stock-asc") return a.stock - b.stock;
      if (sortBy === "name-asc") return a.nombre.localeCompare(b.nombre);
      return 0;
    });

    return list;
  }, [query, categoria, sortBy, products]);

  const sortedCrystals = useMemo(() => {
    if (!crystals) return [];
    return [...crystals].sort((a: any, b: any) => {
      if (crystalSort === 'stock-asc') return a.stock - b.stock;
      return b.stock - a.stock;
    });
  }, [crystals, crystalSort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const start = (page - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Handlers


  const handleOpenQr = (p: Producto) => {
    const qrValue = p.producto_id?.toString()
    setQrModal({ open: true, value: qrValue, title: p.nombre });
  };

  const handleCopyQr = () => {
    if (qrModal.value) {
      navigator.clipboard.writeText(qrModal.value);
      Swal.fire("Éxito", "Código copiado al portapapeles", "success");
    }
  };

  const handleReduceStockClick = (p: Producto) => {
    setReduceStockModal({ open: true, product: p });
    setReduceAmount('1');
  };

  const confirmReduceStock = async () => {
    if (!reduceStockModal.product) return;

    const amount = parseInt(reduceAmount);
    if (isNaN(amount) || amount <= 0) return Swal.fire("Error", "Cantidad inválida", "error");

    const product = reduceStockModal.product;
    const newStock = Math.max(0, product.stock - amount);

    try {
      // Usamos PUT con todo el producto actualizado
      // OJO: sp_producto_editar requiere todos los campos.
      await LOAApi.put(`/api/products/${product.producto_id}`, {
        ...product,
        stock: newStock
      });

      // Invalidar query para refrescar
      queryClient.invalidateQueries({ queryKey: ['products'] });
      Swal.fire("Éxito", "Stock actualizado", "success");
      setReduceStockModal({ open: false, product: null });
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Error al actualizar stock", "error");
    }
  };

  // Pagination
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const resetPageIfNeeded = () => setPage(1);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">Consulta de Stock</h2>
            {/* Show refresh button for active tab context? For now global refresh checks both or just products */}
            <RefreshButton queryKey={activeInfoTab === 'products' ? "products" : "crystals"} isFetching={isLoading || isLoadingCrystals} />
          </div>
          <p className="text-sm text-crema/80">Ver y gestionar el inventario</p>
        </div>

        <div className="flex gap-2 items-center">

          <div className="flex bg-gray-700/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveInfoTab('products')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeInfoTab === 'products' ? 'bg-celeste text-azul shadow' : 'text-gray-300 hover:text-white'}`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveInfoTab('crystals')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeInfoTab === 'crystals' ? 'bg-celeste text-azul shadow' : 'text-gray-300 hover:text-white'}`}
            >
              Cristales
            </button>
          </div>
        </div>
      </div>

      {/* CONTROLS */}

      {/* PRODUCTS CONTROLS */}
      {activeInfoTab === 'products' && (
        <div className="bg-azul/10 border border-crema rounded-lg p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-2 w-full md:w-2/3">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPageIfNeeded(); }}
              className="w-full input"
              placeholder="Buscar..."
            />

            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value as any); resetPageIfNeeded(); }}
              className="input max-w-[150px]"
            >
              <option value="">Tipos</option>
              <option value="ALL">Todos</option>
              <option value="ARMAZON">Armazón</option>
              <option value="CRISTAL">Cristal</option>
              <option value="ACCESORIO">Accesorio</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input max-w-[170px]"
            >
              <option value="stock-desc">Stock -</option>
              <option value="stock-asc">Stock +</option>
              <option value="name-asc">A-Z</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-crema/80">{pageItems.length}/{filtered.length}</span>
            <button onClick={goPrev} disabled={page === 1} className="btn-secondary px-2 py-1 disabled:opacity-50">Need</button>
            <button onClick={goNext} disabled={page === totalPages} className="btn-primary px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* CRYSTALS CONTROLS */}
      {activeInfoTab === 'crystals' && (
        <div className="bg-azul/10 border border-crema rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            {/* Material Selector */}
            <div className="col-span-1">
              <label className="text-xs text-gray-400">Material</label>
              <select
                value={crystalFilters.material}
                onChange={e => setCrystalFilters(prev => ({ ...prev, material: e.target.value }))}
                className="input w-full"
              >
                <option value="ALL">Todos</option>
                {materials.map((m: CrystalMaterial) => (
                  <option key={m.material_id} value={m.nombre}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400">Esfera Desde</label>
              <input
                type="number" step="0.25"
                value={crystalFilters.esferaFrom}
                onChange={e => setCrystalFilters(prev => ({ ...prev, esferaFrom: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Esfera Hasta</label>
              <input
                type="number" step="0.25"
                value={crystalFilters.esferaTo}
                onChange={e => setCrystalFilters(prev => ({ ...prev, esferaTo: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Cilindro Desde</label>
              <input
                type="number" step="0.25"
                value={crystalFilters.cilindroFrom}
                onChange={e => setCrystalFilters(prev => ({ ...prev, cilindroFrom: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Cilindro Hasta</label>
              <input
                type="number" step="0.25"
                value={crystalFilters.cilindroTo}
                onChange={e => setCrystalFilters(prev => ({ ...prev, cilindroTo: e.target.value }))}
                className="input w-full"
              />
            </div>

            {/* Sort Selector */}
            <div className="col-span-1">
              <label className="text-xs text-gray-400">Orden Stock</label>
              <select
                value={crystalSort}
                onChange={(e) => setCrystalSort(e.target.value as any)}
                className="input w-full"
              >
                <option value="stock-asc">Menor a Mayor</option>
                <option value="stock-desc">Mayor a Menor</option>
              </select>
            </div>

            {/* Currency Toggle */}
            <div className="col-span-1 flex items-end">
              <button
                onClick={() => setCurrencyMode(prev => prev === 'ARS' ? 'USD' : 'ARS')}
                className='w-full rounded font-bold text-sm transition-colors btn-primary w-full'
              >
                {currencyMode === 'ARS' ? 'Ver en USD' : 'Ver en Pesos'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => refetchCrystals()}
                className="btn-primary w-full"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Mobile: Cards (Products Only) ===== */}
      {activeInfoTab === 'products' && (
        <div className="grid gap-2 md:hidden">
          {pageItems.map((p) => (
            <article key={p.producto_id} className="bg-white rounded-lg p-3 shadow-sm border">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{p.nombre}</h3>
                  <p className="text-xs text-gray-500 truncate">{p.ubicacion}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${statusBadge(p.stock)}`}>{p.stock} u.</span>
                    <button onClick={() => handleOpenQr(p)} className="text-xs text-blue-600 underline">Ver QR</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end ml-2">
                  <button className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200" onClick={() => handleReduceStockClick(p)}>- Stock</button>
                  <button className="text-xs text-azul underline" onClick={() => console.log("Detalle", p.producto_id)}>Detalle</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ===== Desktop: Table (Products Only) ===== */}
      {activeInfoTab === 'products' && (
        <div className="hidden md:block overflow-hidden bg-white rounded-lg shadow-sm border-blanco/20">
          <table className="min-w-full table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm w-[25%]">Nombre</th>
                <th className="px-4 py-3 text-center text-sm w-[10%]">QR</th>
                <th className="px-4 py-3 text-left text-sm w-[20%]">Ubicación</th>
                <th className="px-4 py-3 text-left text-sm w-[10%]">Tipo</th>
                <th className="px-4 py-3 text-center text-sm w-[10%]">Stock</th>
                <th className="px-4 py-3 text-right text-sm w-[25%]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr
                  key={p.producto_id}
                  className={`border-b last:border-0 border-gray-100 transition-colors ${p.is_active ? 'hover:bg-amber-50' : 'bg-gray-100 opacity-60 hover:bg-gray-200'}`}
                >
                  <td className="px-4 py-2 text-sm truncate" title={p.nombre}>
                    {p.nombre}
                    {!p.is_active && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase text-white bg-gray-500 rounded">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => handleOpenQr(p)} className="text-gray-500 hover:text-black">
                      <span className="text-xl">📱</span>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-sm truncate" title={p.ubicacion}>{p.ubicacion || '-'}</td>
                  <td className="px-4 py-2 text-sm">{p.tipo}</td>
                  <td className="px-4 py-2 text-center text-sm">
                    <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${statusBadge(p.stock)}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-sm space-x-2">
                    <button
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transaction"
                      onClick={() => handleReduceStockClick(p)}
                      title="Reducir Stock"
                    >
                      - Stock
                    </button>
                    <button className="text-blue-600 hover:underline" onClick={() => console.log("Detalle", p.producto_id)}>Detalle</button>
                    <button className="text-gray-500 hover:underline" onClick={() => console.log("Mover", p.producto_id)}>Mover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== CRYSTALS TABLE ===== */}
      {activeInfoTab === 'crystals' && (
        <div className="overflow-hidden bg-white rounded-lg shadow-sm border-blanco/20">
          <table className="min-w-full table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Material</th>
                <th className="px-4 py-3 text-left text-sm">Tratamiento</th>
                <th className="px-4 py-3 text-center text-sm">Esfera</th>
                <th className="px-4 py-3 text-center text-sm">Cilindro</th>
                <th className="px-4 py-3 text-center text-sm">Stock</th>
                <th className="px-4 py-3 text-right text-sm">Precio ({currencyMode})</th>
              </tr>
            </thead>
            <tbody>
              {sortedCrystals.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-gray-500">No hay resultados (haga clic en Buscar)</td></tr>
              ) : (
                sortedCrystals.map((c: any, idx: number) => {
                  let precioMostrar = 0;

                  if (currencyMode === 'ARS') {
                    // Prioritize backend calculated price
                    precioMostrar = c.precio_pesos > 0
                      ? c.precio_pesos
                      : (c.precio_usd || 0) * (dolarRate || 1);
                  } else {
                    // Show raw USD price
                    precioMostrar = c.precio_usd || 0;
                  }

                  return (
                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{c.material}</td>
                      <td className="px-4 py-2 text-sm">{c.tratamiento}</td>
                      <td className="px-4 py-2 text-center text-sm font-bold text-azul">{c.esfera}</td>
                      <td className="px-4 py-2 text-center text-sm font-bold text-azul">{c.cilindro}</td>
                      <td className="px-4 py-2 text-center text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${statusBadge(c.stock)}`}>{c.stock}</span>
                        {c.stock < 2 && <span className="ml-1 text-xs" title="Stock Crítico">⚠️</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-green-700">
                        {currencyMode === 'USD' ? 'US$ ' : '$ '}
                        {Number(precioMostrar).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer (Products Only) */}
      {activeInfoTab === 'products' && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-crema/80">Pag {page} / {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={goPrev} disabled={page === 1} className="btn-secondary px-3 py-1 disabled:opacity-50">Anterior</button>
            <button onClick={goNext} disabled={page === totalPages} className="btn-primary px-3 py-1 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setQrModal({ ...qrModal, open: false })}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl" onClick={() => setQrModal({ ...qrModal, open: false })}>✕</button>
            <h3 className="text-lg font-bold mb-4 text-center truncate">{qrModal.title}</h3>
            <div className="flex justify-center mb-4 p-2 border rounded bg-white">
              <QRCodeSVG value={qrModal.value} size={200} />
            </div>
            <p className="text-xs text-center text-gray-400 mb-2 truncate">{qrModal.value}</p>
            <button onClick={handleCopyQr} className="w-full btn-secondary py-2">Copiar Código</button>
          </div>
        </div>
      )}

      {/* REDUCE STOCK MODAL */}
      {reduceStockModal.open && reduceStockModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-xs w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2">Reducir Stock</h3>
            <p className="text-sm text-gray-600 mb-4 truncate">{reduceStockModal.product.nombre}</p>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Cantidad a descontar</label>
              <input
                type="number"
                min="1"
                max={reduceStockModal.product.stock}
                value={reduceAmount}
                onChange={e => setReduceAmount(e.target.value)}
                className="input w-full text-center text-xl font-bold"
              />
              <p className="text-xs text-right mt-1">Actual: {reduceStockModal.product.stock}</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setReduceStockModal({ open: false, product: null })} className="flex-1 btn-secondary py-2">Cancelar</button>
              <button onClick={confirmReduceStock} className="flex-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 py-2">Confirmar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
