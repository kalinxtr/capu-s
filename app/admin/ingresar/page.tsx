import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LogoPizza } from "@/app/LogoPizza";
import { ajustesActuales } from "@/lib/datos";
import { haySesion } from "@/lib/sesion";
import { ingresar } from "../acciones";
import { FormAccion } from "../_componentes/formularios";
import { CampoClave } from "../_componentes/ingreso";

export const metadata: Metadata = { title: { absolute: "Ingresar · Admin" }, robots: { index: false } };

export default async function Ingresar() {
  await connection();
  if (await haySesion()) redirect("/admin/pedidos");
  const ajustes = await ajustesActuales();
  return (
    <main className="admin ingresar">
      <div className="marca">
        <LogoPizza />
        <div>
          <h1>Admin</h1>
          <p className="ayuda">{ajustes.nombre_local}</p>
        </div>
      </div>
      <FormAccion accion={ingresar} className="tarjeta">
        <CampoClave />
        <button className="boton-principal ancho">Entrar</button>
      </FormAccion>
    </main>
  );
}
