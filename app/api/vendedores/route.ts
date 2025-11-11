
import { NextResponse } from 'next/server';
import { consultarGerentes, consultarVendedores } from '@/lib/vendedores-service';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const codGerente = searchParams.get('codGerente');

    // Obter ID_EMPRESA do usuário logado
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie?.value) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const usuario = JSON.parse(userCookie.value);
    const idEmpresa = usuario.ID_EMPRESA || usuario.id_empresa;

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    if (tipo === 'gerentes') {
      const gerentes = await consultarGerentes(idEmpresa);
      return NextResponse.json(gerentes);
    } else if (tipo === 'vendedores') {
      const vendedores = await consultarVendedores(
        idEmpresa,
        codGerente ? parseInt(codGerente) : undefined
      );
      return NextResponse.json(vendedores);
    }

    return NextResponse.json({ error: 'Tipo não especificado' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao consultar vendedores:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar vendedores' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
