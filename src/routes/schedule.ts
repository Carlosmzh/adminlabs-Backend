import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { auth } from '../middlewares/auth';
import { swrCache } from '../middlewares/cache';

const router = Router();

function getWeekRange(semana: string): { start: Date; end: Date } {
  const date = new Date(semana);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 5);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.get('/', auth, swrCache('schedule'), async (req: Request, res: Response) => {
  const semana = req.query.semana as string;
  const aulaId = req.query.aula_id as string | undefined;

  if (!semana) {
    res.status(400).json({ error: 'Parámetro semana requerido (YYYY-MM-DD)' });
    return;
  }

  const { start, end } = getWeekRange(semana);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const startYear = start.getFullYear();
  const semester = `${startYear}-${start.getMonth() < 6 ? '1' : '2'}`;

  let aulasQuery = supabase.from('aulas').select('*').neq('estado', 'mantenimiento');
  if (aulaId) {
    aulasQuery = aulasQuery.eq('id', aulaId);
  }
  const { data: aulas, error: aulasError } = await aulasQuery;

  if (aulasError) {
    res.status(500).json({ error: 'Error al obtener aulas' });
    return;
  }

  const aulaIds = aulas.map((a) => a.id);

  const [horariosResult, reservasResult, feriadosResult, mantenimientoResult] = await Promise.all([
    supabase.from('horarios_fijos').select('*').in('aula_id', aulaIds).eq('semestre', semester),
    supabase.from('reservas').select('*, usuarios:usuario_id(nombre, email)').in('aula_id', aulaIds).gte('dia', startStr).lte('dia', endStr),
    supabase.from('feriados').select('*').gte('fecha', startStr).lte('fecha', endStr),
    supabase.from('mantenimientos').select('*').in('aula_id', aulaIds).neq('estado', 'resuelto'),
  ]);

  const horarios = horariosResult.data || [];
  const reservas = reservasResult.data || [];
  const feriados = feriadosResult.data || [];
  const mantenimientos = mantenimientoResult.data || [];

  const feriadosMap = new Map<string, string>();
  for (const f of feriados) {
    feriadosMap.set(f.fecha, f.descripcion);
  }

  const reservasMap = new Map<string, typeof reservas>();
  for (const r of reservas) {
    const key = `${r.aula_id}:${r.dia}:${r.franja}`;
    if (!reservasMap.has(key)) reservasMap.set(key, []);
    reservasMap.get(key)!.push(r);
  }

  const mantenimientoAulas = new Set(mantenimientos.map((m) => m.aula_id));

  const schedule: Record<string, unknown>[] = [];

  for (let d = 0; d < 6; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    const diaSemana = date.getDay() === 0 ? 6 : date.getDay();

    const esFeriado = feriadosMap.has(dateStr);
    const feriadoDesc = feriadosMap.get(dateStr) || null;

    for (const aula of aulas) {
      const horarioDelDia = horarios.filter(
        (h) => h.aula_id === aula.id && h.dia_semana === diaSemana
      );

      for (let franja = 1; franja <= 9; franja++) {
        const key = `${aula.id}:${dateStr}:${franja}`;
        const tieneHorario = horarioDelDia.some((h) => h.franja === franja);
        const reservasCelda = reservasMap.get(key) || [];
        const enMantenimiento = mantenimientoAulas.has(aula.id);

        let estado: string;
        if (esFeriado) {
          estado = 'feriado';
        } else if (tieneHorario && reservasCelda.length > 0) {
          estado = 'ocupada';
        } else if (tieneHorario) {
          estado = 'libre';
        } else if (enMantenimiento) {
          estado = 'mantenimiento';
        } else {
          estado = 'vacio';
        }

        schedule.push({
          aula_id: aula.id,
          aula_nombre: aula.nombre,
          aula_tipo: aula.tipo,
          aula_capacidad: aula.capacidad,
          dia: dateStr,
          dia_semana: diaSemana,
          franja,
          estado,
          feriado: feriadoDesc,
          reservas: reservasCelda,
          horario: tieneHorario
            ? horarioDelDia.find((h) => h.franja === franja) || null
            : null,
        });
      }
    }
  }

  res.json({
    semana: { inicio: startStr, fin: endStr },
    schedule,
  });
});

export default router;
