import { Header } from "@/components/manager/header";
import { NewShipmentForm } from "@/components/manager/shipments/new-shipment-form";

export const metadata = { title: "Nuevo envío — Sistema Logístico" };

export default function NewShipmentPage() {
  return (
    <>
      <Header title="Nuevo envío" />
      <NewShipmentForm />
    </>
  );
}
