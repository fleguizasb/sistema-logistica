import { Header } from "@/components/manager/header";
import { getShipmentById } from "@/lib/actions/shipments";
import { getLogisticsCompanies } from "@/lib/actions/logistics";
import { ShipmentDetail } from "@/components/manager/shipments/shipment-detail";
import LogisticsSection from "@/components/manager/shipments/logistics-section";
import { notFound } from "next/navigation";

export const metadata = { title: "Detalle de envío — Sistema Logístico" };

interface PageProps {
  params: { id: string };
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const [shipment, companies] = await Promise.all([
    getShipmentById(params.id),
    getLogisticsCompanies(),
  ]);

  if (!shipment) notFound();

  return (
    <>
      <Header title="Detalle de envío" />
      <ShipmentDetail shipment={shipment} />
      <LogisticsSection
        shipmentId={shipment.id}
        currentCompanyId={shipment.logisticsCompanyId ?? null}
        currentTrackingCode={shipment.externalTrackingCode ?? null}
        currentTrackingUrl={shipment.externalTrackingUrl ?? null}
        companies={companies}
      />
    </>
  );
}
