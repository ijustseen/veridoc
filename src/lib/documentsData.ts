export const documents = [
  { id: "1", name: "NDA Agreement.pdf", signatures: "2/3", status: "Pending" },
  {
    id: "2",
    name: "Partnership Contract.pdf",
    signatures: "1/1",
    status: "Signed",
  },
  { id: "3", name: "Invoice_2024-07.pdf", signatures: "0/2", status: "Draft" },
];

export function getDocumentById(id: string) {
  return documents.find((doc) => doc.id === id);
}
