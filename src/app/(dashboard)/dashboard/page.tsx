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
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { Document } from "@/storage/database/types";

const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "title",
    header: "Name",
    cell: ({ row }) => (
      <span className="text-primary">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "creator_address",
    header: "Creator Address",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return date.toLocaleDateString();
    },
  },
];

export default function Dashboard() {
  const router = useRouter();
  const { account, isInitialLoading } = useWallet();
  const [createdDocuments, setCreatedDocuments] = React.useState<Document[]>(
    []
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchDocuments = async () => {
      if (isInitialLoading || !account) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/document/list?wallet=${account}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Document[] = await response.json();
        const userCreatedDocs = data.filter(
          (doc) => doc.creator_address.toLowerCase() === account.toLowerCase()
        );
        const sortedDocs = userCreatedDocs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setCreatedDocuments(sortedDocs.slice(0, 3));
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [account, isInitialLoading]);

  const table = useReactTable({
    data: createdDocuments,
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
            <span className="text-3xl font-bold">N/A</span>
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
            <span className="text-3xl font-bold">N/A</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Encrypted documents</CardTitle>
            <CardDescription>Accessible encrypted documents</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">N/A</span>
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-destructive"
                  >
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
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
