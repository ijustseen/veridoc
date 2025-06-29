"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { documents } from "@/lib/documentsData";

// Описание колонок для таблицы
const columns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="text-primary">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "signatures",
    header: "Signatures",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: any = "outline";
      if (status === "Signed") variant = "default";
      if (status === "Draft") variant = "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
];

export default function DocumentsPage() {
  const [search, setSearch] = React.useState("");
  const router = useRouter();

  // Фильтрация документов по названию
  const filteredDocuments = React.useMemo(
    () =>
      documents.filter((doc) =>
        doc.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const table = useReactTable({
    data: filteredDocuments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="max-w-md mb-4">
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => router.push(`/documents/${row.original.id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      router.push(`/documents/${row.original.id}`);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
