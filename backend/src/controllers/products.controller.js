const { pool } = require('../db');

const PRODUCT_COLUMNS = `
  id, sku, name, brand, category, size, color, price,
  stock, min_stock, description, created_at, updated_at
`;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, 'El ID del producto no es válido.');
  }

  return id;
}

function normalizeProduct(body = {}) {
  return {
    sku: String(body.sku ?? '').trim().toUpperCase(),
    name: String(body.name ?? '').trim(),
    brand: String(body.brand ?? '').trim(),
    category: String(body.category ?? '').trim(),
    size: Number(body.size),
    color: String(body.color ?? '').trim(),
    price: Number(body.price),
    stock: Number(body.stock),
    min_stock: Number(body.min_stock),
    description: String(body.description ?? '').trim(),
  };
}

function validateProduct(product) {
  const errors = [];

  if (!product.sku || product.sku.length < 3 || product.sku.length > 30) {
    errors.push('El SKU debe tener entre 3 y 30 caracteres.');
  }

  if (!product.name || product.name.length < 3 || product.name.length > 120) {
    errors.push('El nombre debe tener entre 3 y 120 caracteres.');
  }

  if (!product.brand || product.brand.length > 80) {
    errors.push('La marca es obligatoria y debe tener máximo 80 caracteres.');
  }

  if (!product.category || product.category.length > 80) {
    errors.push('La categoría es obligatoria y debe tener máximo 80 caracteres.');
  }

  if (!Number.isFinite(product.size) || product.size < 20 || product.size > 60) {
    errors.push('La talla debe estar entre 20 y 60.');
  }

  if (!product.color || product.color.length > 60) {
    errors.push('El color es obligatorio y debe tener máximo 60 caracteres.');
  }

  if (
    !Number.isFinite(product.price) ||
    product.price < 0 ||
    product.price > 999999.99
  ) {
    errors.push('El precio debe ser un número mayor o igual a 0.');
  }

  if (!Number.isInteger(product.stock) || product.stock < 0) {
    errors.push('El stock debe ser un número entero mayor o igual a 0.');
  }

  if (!Number.isInteger(product.min_stock) || product.min_stock < 0) {
    errors.push('El stock mínimo debe ser un entero mayor o igual a 0.');
  }

  if (product.description.length > 500) {
    errors.push('La descripción debe tener máximo 500 caracteres.');
  }

  if (errors.length > 0) {
    throw createHttpError(400, errors.join(' '));
  }
}

async function listProducts(req, res, next) {
  try {
    const { q = '', brand = '', status = 'all' } = req.query;
    const conditions = [];
    const values = [];

    if (String(q).trim()) {
      values.push(`%${String(q).trim()}%`);
      const parameter = `$${values.length}`;

      conditions.push(
        `(sku ILIKE ${parameter}
        OR name ILIKE ${parameter}
        OR brand ILIKE ${parameter}
        OR color ILIKE ${parameter})`,
      );
    }

    if (String(brand).trim()) {
      values.push(String(brand).trim());
      conditions.push(`brand = $${values.length}`);
    }

    if (status === 'available') {
      conditions.push('stock > min_stock');
    } else if (status === 'low') {
      conditions.push('stock > 0 AND stock <= min_stock');
    } else if (status === 'out') {
      conditions.push('stock = 0');
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products
       ${where}
       ORDER BY updated_at DESC, id DESC`,
      values,
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const id = parseId(req.params.id);

    const result = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products
       WHERE id = $1`,
      [id],
    );

    if (!result.rows[0]) {
      throw createHttpError(404, 'Producto no encontrado.');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::INTEGER AS total_products,
        COALESCE(SUM(stock), 0)::INTEGER AS total_units,
        COALESCE(SUM(price * stock), 0)::NUMERIC(14,2) AS inventory_value,
        COUNT(*) FILTER (
          WHERE stock > 0 AND stock <= min_stock
        )::INTEGER AS low_stock,
        COUNT(*) FILTER (
          WHERE stock = 0
        )::INTEGER AS out_of_stock
      FROM products
    `);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = normalizeProduct(req.body);
    validateProduct(product);

    const result = await pool.query(
      `INSERT INTO products
        (
          sku,
          name,
          brand,
          category,
          size,
          color,
          price,
          stock,
          min_stock,
          description
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${PRODUCT_COLUMNS}`,
      [
        product.sku,
        product.name,
        product.brand,
        product.category,
        product.size,
        product.color,
        product.price,
        product.stock,
        product.min_stock,
        product.description || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return next(
        createHttpError(409, 'Ya existe un producto con ese SKU.'),
      );
    }

    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const product = normalizeProduct(req.body);

    validateProduct(product);

    const result = await pool.query(
      `UPDATE products
       SET sku = $1,
           name = $2,
           brand = $3,
           category = $4,
           size = $5,
           color = $6,
           price = $7,
           stock = $8,
           min_stock = $9,
           description = $10
       WHERE id = $11
       RETURNING ${PRODUCT_COLUMNS}`,
      [
        product.sku,
        product.name,
        product.brand,
        product.category,
        product.size,
        product.color,
        product.price,
        product.stock,
        product.min_stock,
        product.description || null,
        id,
      ],
    );

    if (!result.rows[0]) {
      throw createHttpError(404, 'Producto no encontrado.');
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return next(
        createHttpError(409, 'Ya existe otro producto con ese SKU.'),
      );
    }

    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const id = parseId(req.params.id);

    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1
       RETURNING id, sku, name`,
      [id],
    );

    if (!result.rows[0]) {
      throw createHttpError(404, 'Producto no encontrado.');
    }

    res.json({
      message: 'Producto eliminado correctamente.',
      product: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProductById,
  getStats,
  createProduct,
  updateProduct,
  deleteProduct,
};