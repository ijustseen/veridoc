export interface Document {
  id: string;
  name: string;
  signatures: string;
  status: "Pending" | "Signed" | "Draft";
}

export const documents: Document[] = [
  { id: "1", name: "NDA Agreement.pdf", signatures: "2/3", status: "Pending" },
  {
    id: "2",
    name: "Partnership Contract.pdf",
    signatures: "1/1",
    status: "Signed",
  },
  { id: "3", name: "Invoice_2024-07.pdf", signatures: "0/2", status: "Draft" },
];

// Чтобы сделать заглушку пустой, раскомментируйте следующую строку и закомментируйте текущий массив documents:
// export const documents: Document[] = [];

export function getDocumentById(id: string): Document | undefined {
  return documents.find((doc) => doc.id === id);
}
