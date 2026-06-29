import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { auth } from '../middlewares/auth';

const router = Router();

router.post('/', auth, async (req: Request, res: Response) => {
  const { aula_id, dia, franja, tipo, contenido } = req.body;

  if (!aula_id || !dia || !tipo || !contenido) {
    res.status(400).json({ error: 'aula_id, dia, tipo y contenido son requeridos' });
    return;
  }

  const { data, error } = await supabase
    .from('anotaciones')
    .insert({
      aula_id,
      dia,
      franja: franja || null,
      usuario_id: req.user!.userId,
      tipo,
      contenido,
    })
    .select('*, usuarios:usuario_id(nombre, email)')
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al crear anotación' });
    return;
  }

  res.status(201).json({ anotacion: data });
});

router.get('/', auth, async (req: Request, res: Response) => {
  const aulaId = req.query.aula_id as string | undefined;
  const dia = req.query.dia as string | undefined;

  let query = supabase
    .from('anotaciones')
    .select('*, aulas:aula_id(nombre), usuarios:usuario_id(nombre, email)')
    .order('created_at', { ascending: false });

  if (aulaId) query = query.eq('aula_id', aulaId);
  if (dia) query = query.eq('dia', dia);

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: 'Error al obtener anotaciones' });
    return;
  }

  res.json({ anotaciones: data });
});

export default router;
