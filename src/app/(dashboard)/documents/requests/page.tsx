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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useWallet } from "@/components/WalletProvider";
import { InvitationWithDocument } from "@/storage/database/types";

const columns: ColumnDef<InvitationWithDocument>[] = [
  {
    accessorKey: "documents.title",
    header: "Document",
    cell: ({ row }: { row: Row<InvitationWithDocument> }) => (
      <span className="text-primary">{row.original.documents.title}</span>
    ),
  },
  {
    accessorKey: "documents.creator_address",
    header: "Sender",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: Row<InvitationWithDocument> }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "outline";
      if (status === "signed") variant = "default";
      if (status === "ready") variant = "default";
      if (status === "pending" || status === "key_provided")
        variant = "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }: { row: Row<InvitationWithDocument> }) => {
      const date = new Date(row.original.created_at);
      return date.toLocaleDateString();
    },
  },
];

export default function RequestsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [invitations, setInvitations] = React.useState<
    InvitationWithDocument[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const { account, isInitialLoading } = useWallet();

  React.useEffect(() => {
    async function fetchInvitations() {
      if (!account || isInitialLoading) {
        setIsLoading(true);
        return;
      }
      try {
        const response = await fetch(`/api/invitation?wallet=${account}`);
        if (!response.ok) {
          throw new Error("Failed to fetch invitations");
        }
        const data = await response.json();
        setInvitations(data);
      } catch (error) {
        console.error("Error fetching invitations:", error);
        setInvitations([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInvitations();
  }, [account, isInitialLoading]);

  // Pending requests for cards
  const pendingRequests = invitations.filter(
    (req) => req.status === "pending" || req.status === "key_provided"
  );
  // Requests for table (not pending)
  const filteredRequests = React.useMemo(
    () =>
      invitations.filter(
        (req) =>
          (req.status === "signed" || req.status === "ready") &&
          req.documents.title.toLowerCase().includes(search.toLowerCase()) &&
          (statusFilter ? req.status === statusFilter : true)
      ),
    [search, statusFilter, invitations]
  );

  const table = useReactTable<InvitationWithDocument>({
    data: filteredRequests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  return (
    <>
      {/* Pending requests as cards */}
      {pendingRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {pendingRequests.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <CardTitle>{req.documents.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-sm text-muted-foreground">
                  <span className="font-medium">Sender:</span>{" "}
                  {req.documents.creator_address}
                </div>
                <div className="mb-2 text-sm text-muted-foreground">
                  <span className="font-medium">Date:</span>{" "}
                  {new Date(req.created_at).toLocaleDateString()}
                </div>
                <Badge variant="secondary">
                  {req.status === "pending" ? "Pending" : "Key Provided"}
                </Badge>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() =>
                    router.push(`/documents/${req.documents.id}/sign`)
                  }
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
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
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
                  onClick={() =>
                    router.push(`/documents/${row.original.documents.id}`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      router.push(`/documents/${row.original.documents.id}`);
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
