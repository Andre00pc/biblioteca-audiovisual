import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './services/dbService.js';
import tmdbRoutes from './routes/tmdbRoutes.js';
import bibliotecaRoutes from './routes/bibliotecaRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        mensagem: 'Servidor da Biblioteca Audiovisual operante.'
    });
});

app.use('/api/tmdb', tmdbRoutes);
app.use('/api/biblioteca', bibliotecaRoutes);

app.use((req, res) => {
    res.status(404).json({
        erro: `Rota não encontrada: ${req.method} ${req.originalUrl}`
    });
});

initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`[Servidor] Rodando na porta ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('[Banco] Falha ao inicializar o SQLite:', error);
        process.exit(1);
    });