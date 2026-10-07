import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewOrderForm from "@/components/requester/new-order-form";

export default async function NewOrderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo pedido</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cargá los datos del envío. El gestor se encargará de asignarlo.
        </p>
      </div>
      <NewOrderForm userId={session.user.id!} />
    </div>
  );
}
