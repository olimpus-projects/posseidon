import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { PosseidonService } from ".";
const app = express();

app.set('trust proxy', 1);
app.use(cors());

app.use(bodyParser.json());                        
app.use(bodyParser.urlencoded({ extended: true }));
// Inicializa a fila (ajuste o caminho do banco de dados se necessário)
export const service = new PosseidonService();

// Rota health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Rota para adicionar itens à fila
app.post('/queue', async (req, res) => {
  try {
    const { callback_url, file } = req.body;
    await service.start();
    const job = {
      timestamp: Date.now().toString(), // timestamp as number to match QueueItem type
      status: 'pending',
      callback_url,
      file
    };
    //const id = await service.newJob(job);
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error });
  }
});

export default app;