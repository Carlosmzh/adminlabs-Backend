import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { auth } from '../middlewares/auth';
import { invalidateCache } from '../lib/cache';

const router = Router();

router.post('/', auth, async (req: Request, res: Response) => {
  const { aula_id, dia, franja, motivo } = req.body;

  if (!aula_id || !dia || !franja) {
    res.status(400).json({ error: 'aula_id, dia y franja son requeridos' });
    return;
  }

  const { data, error } = await supabase
    .from('reservas')
    .insert({ aula_id, dia, franja, usuario_id: req.user!.userId, motivo: motivo || '' })
    .select('*, usuarios:usuario_id(nombre, email)')
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al crear reserva' });
    return;
  }

  invalidateCache('schedule');
  res.status(201).json({ reserva: data });
});

router.delete('/:id', auth, async (req: Request, res: Response) => {
  const { data: reserva, error: findError } = await supabase
    .from('reservas')
    .select('usuario_id')
    .eq('id', req.params.id)
    .single();

  if (findError || !reserva) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  if (reserva.usuario_id !== req.user!.userId && req.user!.rol !== 'encargado') {
    res.status(403).json({ error: 'No tienes permiso para eliminar esta reserva' });
    return;
  }

  const { error } = await supabase
    .from('reservas')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    res.status(500).json({ error: 'Error al eliminar reserva' });
    return;
  }

  invalidateCache('schedule');
  res.json({ mensaje: 'Reserva eliminada correctamente' });
});

export default router;
