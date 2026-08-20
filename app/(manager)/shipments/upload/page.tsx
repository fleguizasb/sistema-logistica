import { Header } from "@/components/manager/header";
import { PdfUploadFlow } from "@/components/manager/shipments/pdf-upload-flow";

export const metadata = { title: "Subir PDF — Sistema Logístico" };

export default function UploadPdfPage() {
  return (
    <>
      <Header title="Subir PDF" />
      <PdfUploadFlow />
    </>
  );
}
