"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { documents, Document } from "@/lib/documentsData";
import { useRouter } from "next/navigation";

const columns: ColumnDef<Document>[] = [
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
      let variant: "outline" | "default" | "secondary" = "outline";
      if (status === "Signed") variant = "default";
      if (status === "Draft") variant = "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
];

export default function Dashboard() {
  const lastTwoDocuments = documents.slice(-2); // Get the last two documents
  const router = useRouter();

  const table = useReactTable({
    data: lastTwoDocuments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <section className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
        <Card className="w-full ">
          <CardHeader>
            <CardTitle>Create a new document</CardTitle>
            <CardDescription>
              Upload a PDF and specify the addresses of the signers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/documents/create">Create document</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full ">
          <CardHeader>
            <CardTitle>Verify a document</CardTitle>
            <CardDescription>
              Check an existing document by its hash or ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/documents/requests">Verify document</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Statistics cards */}
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Signed documents</CardTitle>
            <CardDescription>
              Number of documents you have signed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">12</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Created documents</CardTitle>
            <CardDescription>
              Number of documents you have created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">18</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Encrypted documents</CardTitle>
            <CardDescription>Accessible encrypted documents</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">5</span>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h1 className="tracking-tight text-xl">Last signed</h1>
          <Button variant="outline" asChild>
            <Link href="/documents">View all</Link>
          </Button>
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
                  <TableRow key={row.id}>
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
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <p className="text-muted-foreground mb-2">
                      No documents found. Why not create one?
                    </p>
                    <Button onClick={() => router.push("/documents/create")}>
                      Create your first document
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
