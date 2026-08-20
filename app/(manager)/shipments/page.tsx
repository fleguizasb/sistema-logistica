import { Header } from "@/components/manager/header";
import { getShipments } from "@/lib/actions/shipments";
import { ShipmentsList } from "@/components/manager/shipments/shipments-list";
import { ShipmentStatus } from "@prisma/client";

export const metadata = { title: "Envíos — Sistema Logístico" };

interface PageProps {
  searchParams: { status?: string };
}

export default async function ShipmentsPage({ searchParams }: PageProps) {
  const rawStatus = searchParams.status;
  const isValidStatus =
    rawStatus && Object.values(ShipmentStatus).includes(rawStatus as ShipmentStatus);

  const status = isValidStatus ? (rawStatus as ShipmentStatus) : "ALL";
  const shipments = await getShipments(status === "ALL" ? undefined : status);

  return (
    <>
      <Header title="Envíos" />
      <ShipmentsList shipments={shipments} currentStatus={status} />
    </>
  );
}
