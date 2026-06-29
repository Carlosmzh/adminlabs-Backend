import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { auth, adminOnly } from '../middlewares/auth';
import { swrCache } from '../middlewares/cache';
import { invalidateCache } from '../lib/cache';

const router = Router();

router.get('/', auth, swrCache('feriados'), async (req: Request, res: Response) => {
  const anio = req.query.anio as string | undefined;

  let query = supabase.from('feriados').select('*').order('fecha');

  if (anio) {
    const start = `${anio}-01-01`;
    const end = `${anio}-12-31`;
    query = query.gte('fecha', start).lte('fecha', end);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: 'Error al obtener feriados' });
    return;
  }

  res.json({ feriados: data });
});

router.post('/', auth, adminOnly, async (req: Request, res: Response) => {
  const { fecha, descripcion } = req.body;

  if (!fecha || !descripcion) {
    res.status(400).json({ error: 'Fecha y descripción son requeridos' });
    return;
  }

  const { data, error } = await supabase
    .from('feriados')
    .insert({ fecha, descripcion })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al crear feriado' });
    return;
  }

  invalidateCache('feriados');
  invalidateCache('schedule');
  res.status(201).json({ feriado: data });
});

router.delete('/:id', auth, adminOnly, async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('feriados')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    res.status(500).json({ error: 'Error al eliminar feriado' });
    return;
  }

  invalidateCache('feriados');
  invalidateCache('schedule');
  res.json({ mensaje: 'Feriado eliminado correctamente' });
});

export default router;
