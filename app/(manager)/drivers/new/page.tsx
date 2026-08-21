import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NewDriverForm } from "@/components/manager/drivers/new-driver-form";

export const metadata = { title: "Nuevo chofer — Logística SleepBox" };

export default async function NewDriverPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-6 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">Nuevo chofer</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Creá una cuenta para que el chofer pueda acceder desde su celular.
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <NewDriverForm />
      </div>
    </div>
  );
}
