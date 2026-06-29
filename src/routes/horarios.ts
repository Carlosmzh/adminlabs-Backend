import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { supabase } from '../lib/supabase';
import { auth, adminOnly } from '../middlewares/auth';
import { swrCache } from '../middlewares/cache';
import { invalidateCache } from '../lib/cache';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth, swrCache('horarios'), async (req: Request, res: Response) => {
  const semestre = req.query.semestre as string | undefined;

  let query = supabase.from('horarios_fijos').select('*');
  if (semestre) {
    query = query.eq('semestre', semestre);
  }

  const { data, error } = await query.order('dia_semana').order('franja');

  if (error) {
    res.status(500).json({ error: 'Error al obtener horarios' });
    return;
  }

  res.json({ horarios: data });
});

router.post('/', auth, adminOnly, async (req: Request, res: Response) => {
  const { aula_id, dia_semana, franja, semestre } = req.body;

  if (!aula_id || !dia_semana || !franja || !semestre) {
    res.status(400).json({ error: 'aula_id, dia_semana, franja y semestre son requeridos' });
    return;
  }

  const { data, error } = await supabase
    .from('horarios_fijos')
    .insert({ aula_id, dia_semana, franja, semestre })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al crear horario' });
    return;
  }

  invalidateCache('horarios');
  invalidateCache('schedule');
  res.status(201).json({ horario: data });
});

router.post('/importar', auth, adminOnly, upload.single('archivo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Archivo CSV requerido' });
    return;
  }

  try {
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const horarios = (records as Record<string, string>[]).map((r) => ({
      aula_id: r.aula_id,
      dia_semana: parseInt(r.dia_semana, 10),
      franja: parseInt(r.franja, 10),
      semestre: r.semestre,
    }));

    const { data, error } = await supabase
      .from('horarios_fijos')
      .insert(horarios)
      .select();

    if (error) {
      res.status(500).json({ error: 'Error al importar horarios', detalle: error.message });
      return;
    }

    invalidateCache('horarios');
    invalidateCache('schedule');
    res.status(201).json({ mensaje: `${data.length} horarios importados`, horarios: data });
  } catch (e) {
    res.status(400).json({ error: 'Error al procesar CSV', detalle: (e as Error).message });
  }
});

router.delete('/:id', auth, adminOnly, async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('horarios_fijos')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    res.status(500).json({ error: 'Error al eliminar horario' });
    return;
  }

  invalidateCache('horarios');
  invalidateCache('schedule');
  res.json({ mensaje: 'Horario eliminado correctamente' });
});

export default router;
