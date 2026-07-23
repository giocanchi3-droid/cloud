CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    brand VARCHAR(80) NOT NULL,
    category VARCHAR(80) NOT NULL,
    size NUMERIC(4,1) NOT NULL
        CHECK (size >= 20 AND size <= 60),
    color VARCHAR(60) NOT NULL,
    price NUMERIC(10,2) NOT NULL
        CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0
        CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 3
        CHECK (min_stock >= 0),
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_set_updated_at
ON products;

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO products (
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
VALUES
(
    'NK-AIR-001',
    'Air Max Pulse',
    'Nike',
    'Deportivo',
    41,
    'Negro',
    129.99,
    14,
    4,
    'Calzado deportivo con amortiguación.'
),
(
    'AD-RUN-002',
    'Ultraboost Light',
    'Adidas',
    'Running',
    42,
    'Blanco',
    159.50,
    3,
    5,
    'Zapato ligero para entrenamiento y carrera.'
),
(
    'PM-CAS-003',
    'Suede Classic',
    'Puma',
    'Casual',
    40,
    'Azul',
    89.99,
    0,
    3,
    'Modelo casual clásico de uso diario.'
),
(
    'NB-574-004',
    'New Balance 574',
    'New Balance',
    'Casual',
    39,
    'Gris',
    109.00,
    9,
    3,
    'Zapato casual con diseño retro.'
),
(
    'UA-BSK-005',
    'Curry Splash',
    'Under Armour',
    'Baloncesto',
    43,
    'Rojo',
    119.90,
    5,
    5,
    'Calzado para baloncesto con buena tracción.'
)
ON CONFLICT (sku) DO NOTHING;