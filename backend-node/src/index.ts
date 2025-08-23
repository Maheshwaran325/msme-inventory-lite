import express from 'express';
import cors from 'cors';
// import dotenv from 'dotenv';

// dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});