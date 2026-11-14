-- Sabores: las categorías de la página pública. Nunca se borran, se archivan.
CREATE TABLE sabores (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

-- Productos de cada sabor. El stock nunca puede quedar negativo: si un pedido lo
-- dejaría en negativo, el CHECK hace fallar todo el batch que crea el pedido.
CREATE TABLE productos (
  id INTEGER PRIMARY KEY,
  sabor_id INTEGER NOT NULL REFERENCES sabores(id),
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL CHECK (precio >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CONSTRAINT stock_no_negativo CHECK (stock >= 0),
  imagen TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);
CREATE INDEX productos_sabor ON productos (sabor_id);

-- Pedidos (= encargos). El id es el número que ve el local; el token es el link del cliente.
CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  entrega TEXT NOT NULL CHECK (entrega IN ('retiro', 'envio')),
  direccion TEXT,
  nota TEXT,
  total INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'preparado', 'entregado', 'cancelado')),
  creado INTEGER NOT NULL,
  actualizado INTEGER NOT NULL
);
CREATE INDEX pedidos_estado_creado ON pedidos (estado, creado);

-- Ítems con nombre y precio copiados: si después cambia el precio, el pedido no cambia.
CREATE TABLE pedido_items (
  id INTEGER PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0)
);
CREATE INDEX pedido_items_pedido ON pedido_items (pedido_id);

-- Datos del local (una sola fila, id = 1).
CREATE TABLE ajustes (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nombre_local TEXT NOT NULL,
  whatsapp TEXT,
  texto_retiro TEXT
);
