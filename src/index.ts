import express from 'express';
import cors from 'cors';
import compression from 'compression';

import { globalRateLimit } from './middlewares/rate-limiter';
import authRoutes from './routes/auth';
import aulasRoutes from './routes/aulas';
import horariosRoutes from './routes/horarios';
import scheduleRoutes from './routes/schedule';
import reservasRoutes from './routes/reservas';
import anotacionesRoutes from './routes/anotaciones';
import mantenimientoRoutes from './routes/mantenimiento';
import feriadosRoutes from './routes/feriados';

const app = express();

app.use(compression());
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(globalRateLimit);

app.use('/api/auth', authRoutes);
app.use('/api/aulas', aulasRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/anotaciones', anotacionesRoutes);
app.use('/api/mantenimiento', mantenimientoRoutes);
app.use('/api/feriados', feriadosRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`AulaControl API corriendo en puerto ${PORT}`);
});
