import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { auth, adminOnly } from '../middlewares/auth';
import { swrCache } from '../middlewares/cache';
import { invalidateCache } from '../lib/cache';

const router = Router();

router.get('/', auth, swrCache('aulas'), async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('aulas')
    .select('*')
    .order('nombre');

  if (error) {
    res.status(500).json({ error: 'Error al obtener aulas' });
    return;
  }

  res.json({ aulas: data });
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('aulas')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Aula no encontrada' });
    return;
  }

  res.json({ aula: data });
});

router.post('/', auth, adminOnly, async (req: Request, res: Response) => {
  const { nombre, tipo, capacidad } = req.body;

  if (!nombre || !tipo) {
    res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    return;
  }

  const { data, error } = await supabase
    .from('aulas')
    .insert({ nombre, tipo, capacidad: capacidad || 0 })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al crear aula' });
    return;
  }

  invalidateCache('aulas');
  res.status(201).json({ aula: data });
});

router.put('/:id', auth, adminOnly, async (req: Request, res: Response) => {
  const { nombre, tipo, capacidad, estado } = req.body;

  const updates: Record<string, unknown> = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (tipo !== undefined) updates.tipo = tipo;
  if (capacidad !== undefined) updates.capacidad = capacidad;
  if (estado !== undefined) updates.estado = estado;

  const { data, error } = await supabase
    .from('aulas')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Aula no encontrada' });
    return;
  }

  invalidateCache('aulas');
  res.json({ aula: data });
});

router.delete('/:id', auth, adminOnly, async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('aulas')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    res.status(500).json({ error: 'Error al eliminar aula' });
    return;
  }

  invalidateCache('aulas');
  res.json({ mensaje: 'Aula eliminada correctamente' });
});

export default router;
