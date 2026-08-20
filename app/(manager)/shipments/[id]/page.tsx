import { Header } from "@/components/manager/header";
import { getShipmentById } from "@/lib/actions/shipments";
import { ShipmentDetail } from "@/components/manager/shipments/shipment-detail";
import { notFound } from "next/navigation";

export const metadata = { title: "Detalle de envío — Sistema Logístico" };

interface PageProps {
  params: { id: string };
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const shipment = await getShipmentById(params.id);

  if (!shipment) notFound();

  return (
    <>
      <Header title="Detalle de envío" />
      <ShipmentDetail shipment={shipment} />
    </>
  );
}
