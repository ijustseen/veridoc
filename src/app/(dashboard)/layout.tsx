import { ReactNode } from "react";
import DashboardBreadcrumb from "@/components/DashboardBreadcrumb";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      <DashboardBreadcrumb />
      {children}
    </>
  );
}
