import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Importação e uso das rotas (Serão ativadas nos próximos passos)
// import tmdbRoutes from './routes/tmdbRoutes.js';
// import bibliotecaRoutes from './routes/bibliotecaRoutes.js';
// app.use('/api/tmdb', tmdbRoutes);
// app.use('/api/biblioteca', bibliotecaRoutes);


app.listen(PORT, () => {
    console.log(`[Servidor] Rodando na porta ${PORT}`);
});