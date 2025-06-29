"use client";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
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
import { Search } from "lucide-react";
import Link from "next/link";

// Добавляем объявление для window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Dashboard() {
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
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Search for..."
            className="flex-grow"
          />
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Table>
          <TableCaption>A list of your previous documents.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Signatures</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Placeholder rows */}
            <TableRow>
              <TableCell className="font-medium">Document A</TableCell>
              <TableCell>2/3</TableCell>
              <TableCell>Pending</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Document B</TableCell>
              <TableCell>1/1</TableCell>
              <TableCell>Signed</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Document C</TableCell>
              <TableCell>0/2</TableCell>
              <TableCell>Draft</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
    </>
  );
}
