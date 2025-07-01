"use client";
import * as React from "react";
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
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/storage/database/types";
import { useWallet } from "@/components/WalletProvider";

// Описание колонок для таблицы
const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "title",
    header: "Title",
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
  {
    accessorKey: "status", // This field doesn't exist in Document, will be removed or updated later
    header: "Status",
    cell: () => {
      // Logic for status might need to be re-evaluated
      // For now, let's just display a placeholder or derive from invitations
      return <Badge variant="outline">N/A</Badge>;
    },
  },
];

export default function DocumentsPage() {
  const [search, setSearch] = React.useState("");
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { account, isInitialLoading } = useWallet();

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
        setDocuments(data);
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

  // Фильтрация документов по названию
  const filteredDocuments = React.useMemo(
    () =>
      documents.filter((doc) =>
        doc.title.toLowerCase().includes(search.toLowerCase())
      ),
    [search, documents]
  );

  const table = useReactTable({
    data: filteredDocuments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="max-w-md flex-grow">
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => router.push("/documents/create")}>
          Create document
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
                  className="h-48 text-center"
                >
                  Loading documents...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center text-destructive"
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
                  className="h-48 text-center"
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
    </>
  );
}
