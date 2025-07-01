import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const documentId = Number(params.id);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    const { signer_address, signature } = await req.json();
    
    if (!signer_address || !signature) {
      return NextResponse.json({ error: 'Требуются signer_address и signature' }, { status: 400 });
    }

    // TODO: Здесь должна быть логика подписания через блокчейн контракт
    // Пока просто возвращаем успех
    console.log(`Документ ${documentId} подписан пользователем ${signer_address}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Документ подписан',
      document_id: documentId,
      signer: signer_address
    });

  } catch (error) {
    console.error('Ошибка подписания документа:', error);
    return NextResponse.json({ error: 'Ошибка подписания документа' }, { status: 500 });
  }
}