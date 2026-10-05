import { config } from './config';
import express from 'express';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import studentRoutes from './routes/student.routes';
import lectureRoutes from './routes/lecture.routes';
import attendanceRoutes from './routes/attendance.routes';
import { authenticate } from './middlewares/authenticate';
import { authorize } from './middlewares/authorize';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use('/api/students/import', authenticate, authorize('ADMIN'), express.json({ limit: '10mb' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use(errorHandler);

app.listen(config.port, () => console.log(`Server running on http://localhost:${config.port}`));