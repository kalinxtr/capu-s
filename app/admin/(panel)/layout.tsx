import { cuentaPedidos } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { Avisos, NavAdmin } from "../componentes";

export const metadata = { title: { template: "%s · Admin", default: "Admin" }, robots: { index: false } };

export default async function Panel({ children }: LayoutProps<"/admin">) {
  await requerirSesion();
  const cuenta = await cuentaPedidos();
  return (
    <Avisos>
      <div className="admin">
        <NavAdmin nuevos={cuenta.nuevo} />
        {children}
      </div>
    </Avisos>
  );
}
