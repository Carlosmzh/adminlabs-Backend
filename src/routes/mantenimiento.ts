import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { auth, adminOnly } from '../middlewares/auth';
import { swrCache } from '../middlewares/cache';
import { invalidateCache } from '../lib/cache';

const router = Router();

router.get('/', auth, swrCache('mantenimiento'), async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select('*, aulas:aula_id(nombre), reportado_por:reportado_por(nombre, email), resuelto_por:resuelto_por(nombre, email)')
    .order('fecha_reporte', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Error al obtener mantenimientos' });
    return;
  }

  res.json({ mantenimientos: data });
});

router.post('/', auth, async (req: Request, res: Response) => {
  const { aula_id, descripcion } = req.body;

  if (!aula_id || !descripcion) {
    res.status(400).json({ error: 'aula_id y descripcion son requeridos' });
    return;
  }

  const fecha_reporte = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('mantenimientos')
    .insert({
      aula_id,
      reportado_por: req.user!.userId,
      fecha_reporte,
      descripcion,
      estado: 'reportado',
    })
    .select('*, aulas:aula_id(nombre)')
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al reportar mantenimiento' });
    return;
  }

  invalidateCache('mantenimiento');
  invalidateCache('schedule');
  res.status(201).json({ mantenimiento: data });
});

router.put('/:id/resolver', auth, adminOnly, async (req: Request, res: Response) => {
  const { solucion } = req.body;

  if (!solucion) {
    res.status(400).json({ error: 'Solución es requerida' });
    return;
  }

  const { data, error } = await supabase
    .from('mantenimientos')
    .update({
      estado: 'resuelto',
      resuelto_por: req.user!.userId,
      solucion,
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Mantenimiento no encontrado' });
    return;
  }

  invalidateCache('mantenimiento');
  invalidateCache('schedule');
  res.json({ mantenimiento: data });
});

export default router;
