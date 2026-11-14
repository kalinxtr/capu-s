export type Entrega = "retiro" | "envio";
export type EstadoPedido = "nuevo" | "preparado" | "entregado" | "cancelado";

export const ESTADOS: EstadoPedido[] = ["nuevo", "preparado", "entregado", "cancelado"];
export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "Nuevo",
  preparado: "Preparado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export type Sabor = { id: number; nombre: string; orden: number; activo: number };

export type Producto = {
  id: number;
  sabor_id: number;
  nombre: string;
  precio: number;
  stock: number;
  imagen: string | null;
  orden: number;
  activo: number;
};

export type Pedido = {
  id: number;
  token: string;
  cliente_nombre: string;
  cliente_telefono: string;
  entrega: Entrega;
  direccion: string | null;
  nota: string | null;
  total: number;
  estado: EstadoPedido;
  creado: number;
  actualizado: number;
};

export type PedidoItem = {
  pedido_id: number;
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
};

export type Ajustes = { nombre_local: string; whatsapp: string | null; texto_retiro: string | null };

/** Resultado de una Server Action que se muestra en un formulario. */
export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string } | null;
