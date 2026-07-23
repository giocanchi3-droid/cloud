import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createProduct,
  deleteProduct,
  getProducts,
  getStats,
  updateProduct,
} from './api';

const EMPTY_PRODUCT = {
  sku: '',
  name: '',
  brand: '',
  category: 'Deportivo',
  size: '40',
  color: '',
  price: '',
  stock: '0',
  min_stock: '3',
  description: '',
};

const EMPTY_STATS = {
  total_products: 0,
  total_units: 0,
  inventory_value: 0,
  low_stock: 0,
  out_of_stock: 0,
};

const money = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
});

function getStockLabel(product) {
  const stock = Number(product.stock);
  const minimum = Number(product.min_stock);

  if (stock === 0) {
    return {
      text: 'Agotado',
      className: 'badge badge-danger',
    };
  }

  if (stock <= minimum) {
    return {
      text: 'Stock bajo',
      className: 'badge badge-warning',
    };
  }

  return {
    text: 'Disponible',
    className: 'badge badge-success',
  };
}

function StatCard({
  label,
  value,
  detail,
  tone = 'neutral',
}) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ProductModal({
  product,
  saving,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(
    product
      ? {
          ...product,
          size: String(product.size),
          price: String(product.price),
          stock: String(product.stock),
          min_stock: String(product.min_stock),
          description: product.description || '',
        }
      : EMPTY_PRODUCT,
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();

    onSave({
      ...form,
      size: Number(form.size),
      price: Number(form.price),
      stock: Number(form.stock),
      min_stock: Number(form.min_stock),
    });
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Inventario</p>

            <h2 id="modal-title">
              {product
                ? 'Editar producto'
                : 'Nuevo producto'}
            </h2>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={submit}
          className="product-form"
        >
          <div className="form-grid">
            <label>
              SKU

              <input
                name="sku"
                value={form.sku}
                onChange={updateField}
                placeholder="NK-AIR-001"
                required
              />
            </label>

            <label>
              Nombre

              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Nike Air Max"
                required
              />
            </label>

            <label>
              Marca

              <input
                name="brand"
                value={form.brand}
                onChange={updateField}
                placeholder="Nike"
                required
              />
            </label>

            <label>
              Categoría

              <select
                name="category"
                value={form.category}
                onChange={updateField}
              >
                <option>Deportivo</option>
                <option>Casual</option>
                <option>Formal</option>
                <option>Running</option>
                <option>Baloncesto</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Talla

              <input
                name="size"
                type="number"
                min="20"
                max="60"
                step="0.5"
                value={form.size}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Color

              <input
                name="color"
                value={form.color}
                onChange={updateField}
                placeholder="Negro"
                required
              />
            </label>

            <label>
              Precio

              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Stock actual

              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Stock mínimo

              <input
                name="min_stock"
                type="number"
                min="0"
                step="1"
                value={form.min_stock}
                onChange={updateField}
                required
              />
            </label>

            <label className="form-span-2">
              Descripción

              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows="3"
                placeholder="Características del producto"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {
                saving
                  ? 'Guardando...'
                  : product
                    ? 'Guardar cambios'
                    : 'Crear producto'
              }
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);

  const [filters, setFilters] = useState({
    q: '',
    brand: '',
    status: 'all',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [modalOpen, setModalOpen] = useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null);

  const brands = useMemo(() => {
    return [
      ...new Set(
        products.map((product) => product.brand),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [products]);

  async function loadData(
    currentFilters = filters,
  ) {
    setLoading(true);
    setError('');

    try {
      const [
        productData,
        statsData,
      ] = await Promise.all([
        getProducts(currentFilters),
        getStats(),
      ]);

      setProducts(productData);
      setStats(statsData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData(filters);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    filters.q,
    filters.brand,
    filters.status,
  ]);

  function changeFilter(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function openCreateModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingProduct(null);
  }

  async function saveProduct(product) {
    setSaving(true);
    setError('');

    try {
      if (editingProduct) {
        await updateProduct(
          editingProduct.id,
          product,
        );

        setNotice(
          'Producto actualizado correctamente.',
        );
      } else {
        await createProduct(product);

        setNotice(
          'Producto creado correctamente.',
        );
      }

      setModalOpen(false);
      setEditingProduct(null);

      await loadData(filters);

      window.setTimeout(
        () => setNotice(''),
        3000,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product) {
    const confirmed = window.confirm(
      `¿Eliminar ${product.name} (${product.sku})?`,
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteProduct(product.id);

      setNotice(
        'Producto eliminado correctamente.',
      );

      await loadData(filters);

      window.setTimeout(
        () => setNotice(''),
        3000,
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            SS
          </div>

          <div>
            <strong>StockStep</strong>
            <span>Cloud Inventory</span>
          </div>
        </div>

        <nav>
          <a
            className="nav-item active"
            href="#dashboard"
          >
            Resumen
          </a>

          <a
            className="nav-item"
            href="#inventory"
          >
            Inventario
          </a>

          <a
            className="nav-item"
            href="#alerts"
          >
            Alertas
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="online-dot" />
          Sistema conectado
        </div>
      </aside>

      <main className="main-content">
        <header
          className="topbar"
          id="dashboard"
        >
          <div>
            <p className="eyebrow">
              Panel de administración
            </p>

            <h1>
              Gestión de stock de zapatos
            </h1>

            <p className="subtitle">
              Controla productos, existencias y
              alertas desde un solo lugar.
            </p>
          </div>

          <button
            className="button button-primary"
            type="button"
            onClick={openCreateModal}
          >
            + Nuevo producto
          </button>
        </header>

        {
          error && (
            <div className="alert alert-error">
              {error}
            </div>
          )
        }

        {
          notice && (
            <div className="alert alert-success">
              {notice}
            </div>
          )
        }

        <section
          className="stats-grid"
          aria-label="Estadísticas del inventario"
        >
          <StatCard
            label="Modelos registrados"
            value={stats.total_products}
            detail="Productos diferentes"
            tone="blue"
          />

          <StatCard
            label="Unidades disponibles"
            value={stats.total_units}
            detail="Existencias acumuladas"
            tone="green"
          />

          <StatCard
            label="Valor del inventario"
            value={money.format(
              Number(stats.inventory_value || 0),
            )}
            detail="Precio por existencias"
            tone="violet"
          />

          <StatCard
            label="Alertas activas"
            value={
              Number(stats.low_stock) +
              Number(stats.out_of_stock)
            }
            detail={
              `${stats.out_of_stock} productos agotados`
            }
            tone="orange"
          />
        </section>

        <section
          className="inventory-panel"
          id="inventory"
        >
          <div className="panel-header">
            <div>
              <p className="eyebrow">
                Productos
              </p>

              <h2>Inventario general</h2>
            </div>

            <span className="result-count">
              {products.length} resultados
            </span>
          </div>

          <div className="filters">
            <label className="search-field">
              <span>Buscar</span>

              <input
                name="q"
                value={filters.q}
                onChange={changeFilter}
                placeholder="Nombre, SKU, marca o color"
              />
            </label>

            <label>
              Marca

              <select
                name="brand"
                value={filters.brand}
                onChange={changeFilter}
              >
                <option value="">
                  Todas
                </option>

                {
                  brands.map((brand) => (
                    <option
                      key={brand}
                      value={brand}
                    >
                      {brand}
                    </option>
                  ))
                }
              </select>
            </label>

            <label>
              Estado

              <select
                name="status"
                value={filters.status}
                onChange={changeFilter}
              >
                <option value="all">
                  Todos
                </option>

                <option value="available">
                  Disponible
                </option>

                <option value="low">
                  Stock bajo
                </option>

                <option value="out">
                  Agotado
                </option>
              </select>
            </label>

            <button
              className="button button-secondary"
              type="button"
              onClick={() => setFilters({
                q: '',
                brand: '',
                status: 'all',
              })}
            >
              Limpiar
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Talla</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {
                  loading ? (
                    <tr>
                      <td
                        className="empty-state"
                        colSpan="7"
                      >
                        Cargando inventario...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td
                        className="empty-state"
                        colSpan="7"
                      >
                        No se encontraron productos.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const status =
                        getStockLabel(product);

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="product-cell">
                              <div className="shoe-avatar">
                                {
                                  product.brand
                                    .slice(0, 2)
                                    .toUpperCase()
                                }
                              </div>

                              <div>
                                <strong>
                                  {product.name}
                                </strong>

                                <span>
                                  {product.sku}
                                  {' · '}
                                  {product.color}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>{product.brand}</td>
                          <td>{product.size}</td>

                          <td>
                            {
                              money.format(
                                Number(product.price),
                              )
                            }
                          </td>

                          <td>
                            <strong>
                              {product.stock}
                            </strong>

                            <span className="muted-block">
                              mín. {product.min_stock}
                            </span>
                          </td>

                          <td>
                            <span
                              className={status.className}
                            >
                              {status.text}
                            </span>
                          </td>

                          <td>
                            <div className="row-actions">
                              <button
                                className="table-button"
                                type="button"
                                onClick={() =>
                                  openEditModal(product)
                                }
                              >
                                Editar
                              </button>

                              <button
                                className="table-button danger"
                                type="button"
                                onClick={() =>
                                  removeProduct(product)
                                }
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )
                }
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="alert-summary"
          id="alerts"
        >
          <div>
            <p className="eyebrow">
              Control preventivo
            </p>

            <h2>Alertas de reposición</h2>
          </div>

          <p>
            Hay <strong>{stats.low_stock}</strong>
            {' '}productos con stock bajo y{' '}
            <strong>{stats.out_of_stock}</strong>
            {' '}agotados.
          </p>
        </section>
      </main>

      {
        modalOpen && (
          <ProductModal
            product={editingProduct}
            saving={saving}
            onClose={closeModal}
            onSave={saveProduct}
          />
        )
      }
    </div>
  );
}

export default App;