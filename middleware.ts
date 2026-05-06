import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const funcao = user.user_metadata?.funcao
    // Só redireciona quando a função está explicitamente definida no metadata.
    // Caso contrário, o layout faz a verificação completa via banco de dados.
    if (funcao !== undefined) {
      if (request.nextUrl.pathname.startsWith('/admin') && funcao !== 'admin') {
        return NextResponse.redirect(new URL('/colaborador', request.url))
      }
      if (request.nextUrl.pathname.startsWith('/colaborador') && funcao === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/colaborador/:path*'],
}
