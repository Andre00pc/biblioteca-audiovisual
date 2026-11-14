import { Router } from 'express';
import * as tmdbController from '../controllers/tmdbController.js';

const router = Router();

router.get('/buscar', tmdbController.buscar);
router.get('/populares', tmdbController.populares);
router.get('/filme/:id', tmdbController.detalhesFilme);
router.get('/serie/:id', tmdbController.detalhesSerie);
router.get('/serie/:id/temporada/:numero', tmdbController.detalhesTemporada);

export default router;
