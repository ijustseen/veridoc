export interface Request {
  id: string;
  documentName: string;
  from: string;
  to: string;
  status: "Pending" | "Accepted" | "Declined";
  date: string;
}

export const requests: Request[] = [
  {
    id: "1",
    documentName: "NDA Agreement.pdf",
    from: "0xA1B2...C3D4",
    to: "0xE5F6...7890",
    status: "Pending",
    date: "2024-06-01",
  },
  {
    id: "2",
    documentName: "Partnership Contract.pdf",
    from: "0x1234...5678",
    to: "0x9ABC...DEF0",
    status: "Accepted",
    date: "2024-06-03",
  },
  {
    id: "3",
    documentName: "Invoice_2024-07.pdf",
    from: "0xAAAA...BBBB",
    to: "0xCCCC...DDDD",
    status: "Declined",
    date: "2024-06-05",
  },
  {
    id: "4",
    documentName: "NDA Agreement.pdf",
    from: "0xA1B2...C3D4",
    to: "0xE5F6...7890",
    status: "Pending",
    date: "2024-06-01",
  },
];

export function getRequestById(id: string): Request | undefined {
  return requests.find((req) => req.id === id);
}
