import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/manager/sidebar";
import { SessionProvider } from "next-auth/react";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "MANAGER") {
    redirect("/login");
  }

  const isOwner = session.user.isOwner ?? false;

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar isOwner={isOwner} />
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
