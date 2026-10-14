import { createClient, type Session } from '@supabase/supabase-js'
import { PARAMETROS_BASE } from './parametros'
import type { Parametros, Proyecto, Rol } from './types'

const URL_NUBE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const LLAVE = import.meta.env.VITE_SUPABASE_KEY as string | undefined

function almacenSesion(): Storage | undefined {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

export const nube = createClient(URL_NUBE ?? 'https://sin-configurar.supabase.co', LLAVE ?? 'sin-llave', {
  auth: { persistSession: true, autoRefreshToken: true, storage: almacenSesion(), storageKey: 'muura-sesion' },
})

export const nubeConfigurada = Boolean(URL_NUBE && LLAVE)

export interface Perfil {
  id: string
  correo: string
  nombre: string
  rol: Rol
  activo: boolean
  creado: string
}

function error(e: { message: string } | null, que: string): void {
  if (e) throw new Error(`${que}: ${traducir(e.message)}`)
}

export function traducir(m: string): string {
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos'
  if (/Email not confirmed/i.test(m)) return 'Falta confirmar el correo'
  if (/User already registered/i.test(m)) return 'Ese correo ya tiene cuenta'
  if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres'
  if (/JWT expired/i.test(m)) return 'La sesión venció, volvé a entrar'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión con el servidor'
  return m
}

export async function sesionActual(): Promise<Session | null> {
  const { data } = await nube.auth.getSession()
  return data.session
}

export async function entrar(correo: string, clave: string): Promise<void> {
  const { error: e } = await nube.auth.signInWithPassword({ email: correo.trim(), password: clave })
  error(e, 'No se pudo entrar')
}

export async function pedirCuenta(nombre: string, correo: string, clave: string): Promise<boolean> {
  const { data, error: e } = await nube.auth.signUp({ email: correo.trim(), password: clave, options: { data: { nombre: nombre.trim() } } })
  error(e, 'No se pudo crear la cuenta')
  if (data.session) await nube.auth.signOut()
  return Boolean(data.user)
}

export async function salir(): Promise<void> {
  await nube.auth.signOut()
}

export async function miPerfil(): Promise<Perfil | null> {
  const s = await sesionActual()
  if (!s) return null
  const { data, error: e } = await nube.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
  error(e, 'No se pudo leer el perfil')
  return data as Perfil | null
}

export async function listarPerfiles(): Promise<Perfil[]> {
  const { data, error: e } = await nube.from('profiles').select('*').order('creado')
  error(e, 'No se pudieron leer los usuarios')
  return (data ?? []) as Perfil[]
}

export async function editarPerfil(id: string, cambios: Partial<Pick<Perfil, 'nombre' | 'rol' | 'activo'>>): Promise<void> {
  const { error: e } = await nube.from('profiles').update(cambios).eq('id', id)
  error(e, 'No se pudo guardar el usuario')
}

export async function cargarParametrosNube(): Promise<Parametros> {
  const { data, error: e } = await nube.from('parametros').select('datos').eq('id', 1).maybeSingle()
  error(e, 'No se pudieron leer los precios')
  return completarParametros((data?.datos ?? {}) as Partial<Parametros>)
}

export function completarParametros(g: Partial<Parametros>): Parametros {
  const p = { ...PARAMETROS_BASE, ...g }
  const faltan = PARAMETROS_BASE.materiales.filter((b) => !p.materiales.some((x) => x.nombre === b.nombre))
  return {
    ...p,
    materiales: [...p.materiales, ...faltan].map((x) => ({ ...x, contrapeso: x.contrapeso ?? p.pesoExtraAjuste })),
    lineas: p.lineas.map((l) => ({ ...l, precioUSD: l.precioUSD ?? null })),
  }
}

export async function guardarParametrosNube(p: Parametros): Promise<void> {
  const { error: e } = await nube.from('parametros').upsert({ id: 1, datos: p, modificado: new Date().toISOString() })
  error(e, 'No se pudieron guardar los precios')
}

export interface FilaProyecto {
  id: string
  datos: Proyecto
  creado_por: string | null
  modificado: string
}

export async function listarProyectos(): Promise<FilaProyecto[]> {
  const { data, error: e } = await nube.from('proyecto').select('id, datos, creado_por, modificado').order('modificado', { ascending: false })
  error(e, 'No se pudieron leer los proyectos')
  return (data ?? []) as FilaProyecto[]
}

export async function guardarProyectoNube(pr: Proyecto): Promise<string> {
  const ahora = new Date().toISOString()
  const s = await sesionActual()
  const { error: e } = await nube.from('proyecto').upsert({
    id: pr.id,
    folio: pr.folio,
    desarrollo: pr.desarrollo,
    cliente: pr.cliente,
    datos: { ...pr, modificado: ahora },
    modificado: ahora,
    modificado_por: s?.user.id ?? null,
  })
  error(e, 'No se pudo guardar el proyecto')
  return ahora
}

export async function borrarProyectoNube(id: string): Promise<void> {
  const { error: e, count } = await nube.from('proyecto').delete({ count: 'exact' }).eq('id', id)
  error(e, 'No se pudo borrar')
  if (count === 0) throw new Error('No se pudo borrar: solo quien lo creó o un administrador puede borrarlo')
}
