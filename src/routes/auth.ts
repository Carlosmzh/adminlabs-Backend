import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { signToken } from '../lib/jwt';
import { auth, adminOnly } from '../middlewares/auth';
import { authRateLimit } from '../middlewares/rate-limiter';

const router = Router();

router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' });
    return;
  }

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, password_hash, rol')
    .eq('email', email)
    .single();

  if (error || !user) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  const token = signToken({ userId: user.id, rol: user.rol });

  res.json({
    token,
    user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
  });
});

router.post('/register', authRateLimit, auth, adminOnly, async (req: Request, res: Response) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    return;
  }

  const rolFinal = rol === 'encargado' ? 'encargado' : 'ayudante';

  const { data: existing } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    res.status(409).json({ error: 'El email ya está registrado' });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from('usuarios')
    .insert({ nombre, email, password_hash, rol: rolFinal })
    .select('id, nombre, email, rol')
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
    return;
  }

  res.status(201).json({ user });
});

router.get('/me', auth, async (req: Request, res: Response) => {
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol')
    .eq('id', req.user!.userId)
    .single();

  if (error || !user) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  res.json({ user });
});

export default router;
