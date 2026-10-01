import 'dotenv/config';
import express from 'express';
import studentRoutes from './routes/student.routes';
import { errorHandler } from './middlewares/errorHandler';
import lectureRoutes from './routes/lecture.routes';
import attendanceRoutes from './routes/attendance.routes';

const app = express();

app.use(express.json());

app.use('/api/students', studentRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/attendance', attendanceRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));