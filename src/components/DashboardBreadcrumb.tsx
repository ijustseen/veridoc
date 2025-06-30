"use client";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import React from "react";
import { getDocumentById } from "@/lib/documentsData";

export default function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // ["documents"] or ["documents", "create"] etc.

  // Не показываем хлебные крошки на /dashboard
  if (segments.length === 1 && segments[0] === "dashboard") {
    return null;
  }

  const crumbs = [{ label: "Dashboard", href: "/dashboard" }];

  let currentPath = "";
  segments.forEach((seg) => {
    currentPath += `/${seg}`;

    let label = seg;
    if (seg.match(/^\d+$/) || seg === "[id]") {
      const doc = getDocumentById(seg);
      label = doc ? doc.name : "Details"; // Используем название документа, если найдено
    } else {
      label = seg.charAt(0).toUpperCase() + seg.slice(1); // Капитализация первой буквы
    }

    crumbs.push({ label, href: currentPath });
  });

  return (
    <div className="mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {idx === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
