"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { requests, Request } from "@/lib/requestsData";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const columns: ColumnDef<Request>[] = [
  {
    accessorKey: "documentName",
    header: "Document",
    cell: ({ row }: { row: Row<Request> }) => (
      <span className="text-primary">{row.original.documentName}</span>
    ),
  },
  {
    accessorKey: "from",
    header: "Sender",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: Row<Request> }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "outline";
      if (status === "Accepted") variant = "default";
      if (status === "Declined") variant = "destructive";
      if (status === "Pending") variant = "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "date",
    header: "Date",
  },
];

export default function RequestsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const router = useRouter();

  // Pending requests for cards
  const pendingRequests = requests.filter((req) => req.status === "Pending");
  // Requests for table (not pending)
  const filteredRequests = React.useMemo(
    () =>
      requests.filter(
        (req) =>
          req.status !== "Pending" &&
          req.documentName.toLowerCase().includes(search.toLowerCase()) &&
          (statusFilter ? req.status === statusFilter : true)
      ),
    [search, statusFilter]
  );

  const table = useReactTable<Request>({
    data: filteredRequests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* Pending requests as cards */}
      {pendingRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {pendingRequests.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <CardTitle>{req.documentName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-sm text-muted-foreground">
                  <span className="font-medium">Sender:</span> {req.from}
                </div>
                <div className="mb-2 text-sm text-muted-foreground">
                  <span className="font-medium">Date:</span> {req.date}
                </div>
                <Badge variant="secondary">Pending</Badge>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => router.push(`/documents/${req.id}/sign`)}
                >
                  Go to document
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <Input
          placeholder="Search by document name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="all" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Declined">Declined</SelectItem>
          </SelectContent>
        </Select>
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
                  tabIndex={0}
                  role="button"
                  onClick={() => router.push(`/documents/${row.original.id}`)}
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
                    No requests found.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
