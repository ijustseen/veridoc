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

export default function Home() {
  return (
    <div className="container mx-auto p-4 lg:max-w-screen-lg">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">VeriDoc</h1>
        <div className="flex items-center space-x-2">
          <Button>Connect Wallet</Button>
        </div>
      </header>

      <section className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
        <Card className="w-full ">
          <CardHeader>
            <CardTitle>Создать документ</CardTitle>
            <CardDescription>
              Загрузите новый документ для верификации и подписи.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Create document</Button>
          </CardContent>
        </Card>

        <Card className="w-full ">
          <CardHeader>
            <CardTitle>Проверить документ</CardTitle>
            <CardDescription>
              Проверьте существующий документ по его хэшу или ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Verify Document</Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex items-center space-x-2 mb-8">
        <Input type="text" placeholder="Search for..." className="flex-grow" />
        <Button variant="ghost" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </section>

      <section>
        <Table>
          <TableCaption>A list of your documents.</TableCaption>
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
    </div>
  );
}
