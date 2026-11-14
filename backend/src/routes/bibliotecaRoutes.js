import { Router } from 'express';
import * as bibliotecaController from '../controllers/bibliotecaController.js';

const router = Router();

router.get('/', bibliotecaController.listarConteudos);
router.get('/estatisticas', bibliotecaController.obterEstatisticas);
router.get('/:id', bibliotecaController.obterConteudoPorId);

router.post('/', bibliotecaController.salvarConteudo);
router.patch('/:id', bibliotecaController.atualizarConteudo);
router.delete('/:id', bibliotecaController.removerConteudo);

router.post('/:id/avaliacoes', bibliotecaController.adicionarAvaliacao);
router.delete('/avaliacoes/:idAvaliacao', bibliotecaController.removerAvaliacao);

router.post('/:id/temporadas', bibliotecaController.salvarTemporada);
router.patch('/episodios/:idEpisodio', bibliotecaController.atualizarEpisodio);

export default router;
