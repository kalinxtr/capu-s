import { redirect } from "next/navigation";
import { haySesion } from "@/lib/sesion";
import { ingresar } from "../acciones";
import { FormAccion } from "../componentes";

export const metadata = { title: "Admin · La Paletería", robots: { index: false } };

export default async function Ingresar() {
  if (await haySesion()) redirect("/admin/pedidos");
  return (
    <main className="admin ingresar">
      <h1>Admin</h1>
      <FormAccion accion={ingresar} className="tarjeta">
        <label>
          Clave
          <input name="clave" type="password" required autoComplete="current-password" autoFocus />
        </label>
        <button className="boton-principal">Entrar</button>
      </FormAccion>
    </main>
  );
}
