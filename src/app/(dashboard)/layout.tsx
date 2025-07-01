import { ReactNode } from "react";
import DashboardBreadcrumb from "@/components/DashboardBreadcrumb";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex-1 flex flex-col">
      <DashboardBreadcrumb />
      <div className="flex-1 overflow-auto h-full">{children}</div>
    </div>
  );
}
