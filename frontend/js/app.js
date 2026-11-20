import { api } from './api.js';
import { cardHTML, statHTML, sessaoHTML, resultadoHTML, escolhidoHTML, filtrosHTML, linhaHTML, filaHTML, reassistidosHTML, mesesHTML, detalheHTML, episodiosHTML, vazio } from './ui.js';
const main = document.getElementById('main-content');
let redesenhar = null;

const ROTAS = {
    'dashboard':       { view: 'dashboard',       init: iniciarDashboard },
    'colecao':         { view: 'colecao',         init: () => iniciarLista('todos') },
    'filmes':          { view: 'filmes',          init: () => iniciarLista('filme') },
    'series':          { view: 'series',          init: () => iniciarLista('serie') },
    'assistir-depois': { view: 'assistir-depois', init: iniciarFila },
    'historico':       { view: 'historico',       init: iniciarHistorico },
    'favoritos':       { view: 'favoritos',       init: () => iniciarLista('todos', true) },
    'detalhe':         { view: 'detalhe',         init: iniciarDetalhe },
};

async function navegar() {
    redesenhar = null;

    const [nome, ...params] = location.hash.slice(1).split('/');
    const rota = ROTAS[nome] ? nome : 'dashboard';
    const r = ROTAS[rota];

    document.querySelectorAll('#menu a').forEach(a => {
        a.classList.toggle('active', a.dataset.route === rota);
    });

    main.innerHTML = await fetch(`views/${r.view}.html`).then(res => res.text());
    await r.init(...params);
}

async function iniciarFila() {
    const fila = (await api.listarConteudos()).filter(c => c.status_biblioteca === 'Assistir Depois');
    main.querySelector('#grid').innerHTML = fila.length
        ? fila.map(filaHTML).join('')
        : vazio('Sua fila está vazia.');
}

async function iniciarDetalhe(id) {
    const alvo = main.querySelector('#detalhe');
    const conteudo = await api.buscarConteudo(Number(id));

    if (!conteudo) {
        alvo.innerHTML = vazio('Título não encontrado na sua biblioteca.');
        return;
    }

    const sessoes = (await api.listarSessoes()).filter(s => s.id_tmdb === conteudo.id_tmdb);
    alvo.innerHTML = detalheHTML(conteudo, sessoes);
}

const semAcento = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ORDENACOES = {
    recentes: (a, b) => b.adicionado - a.adicionado,
    titulo:   (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
    ano:      (a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || ''),
    nota:     (a, b) => (b.nota_pessoal || 0) - (a.nota_pessoal || 0),
};

async function iniciarLista(tipoFixo, somenteFavoritos = false) {
    let todos = await api.listarConteudos();
    const estado = { busca: '', genero: '', ordem: 'recentes', visao: 'grade', tipo: 'todos', status: 'todos' };

    const barra = main.querySelector('#filtros');
    const grid = main.querySelector('#grid');

    const generos = [...new Set(todos.filter(c => !somenteFavoritos || c.favorito).flatMap(c => c.generos || []))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    barra.innerHTML = filtrosHTML(tipoFixo === 'todos', generos, !somenteFavoritos);

    function desenhar() {
        const termo = semAcento(estado.busca);
        const tipo = tipoFixo === 'todos' ? estado.tipo : tipoFixo;

        const lista = todos
            .filter(c => tipo === 'todos' || c.tipo === tipo)
            .filter(c => !somenteFavoritos || c.favorito)
            .filter(c => semAcento(c.titulo).includes(termo))
            .filter(c => !estado.genero || (c.generos || []).includes(estado.genero))
            .filter(c => estado.status === 'todos'
                || (estado.status === 'favoritos' ? c.favorito : c.status_biblioteca === estado.status))
            .sort(ORDENACOES[estado.ordem]);

        main.querySelector('#contagem').textContent =
            `${lista.length} ${lista.length === 1 ? 'título' : 'títulos'}`;

        grid.className = estado.visao === 'lista' ? 'lista' : 'grid';
        grid.innerHTML = lista.length
            ? lista.map(estado.visao === 'lista' ? linhaHTML : cardHTML).join('')
            : vazio('Nenhum título encontrado.');
    }

    barra.addEventListener('input', e => {
        if (e.target.id !== 'f-busca') return;
        estado.busca = e.target.value;
        desenhar();
    });

    barra.addEventListener('change', e => {
        if (e.target.id === 'f-genero') estado.genero = e.target.value;
        if (e.target.id === 'f-ordem') estado.ordem = e.target.value;
        desenhar();
    });

    barra.addEventListener('click', e => {
        const botao = e.target.closest('[data-f-tipo], [data-f-status], [data-f-visao]');
        if (!botao) return;

        let grupo;
        if (botao.dataset.fTipo) {
            estado.tipo = botao.dataset.fTipo;
            grupo = 'data-f-tipo';
        } else if (botao.dataset.fStatus) {
            estado.status = botao.dataset.fStatus;
            grupo = 'data-f-status';
        } else {
            estado.visao = botao.dataset.fVisao;
            grupo = 'data-f-visao';
        }

        barra.querySelectorAll(`[${grupo}]`).forEach(b => b.classList.toggle('active', b === botao));
        desenhar();
    });

    desenhar();

    redesenhar = async () => {
        todos = await api.listarConteudos();
        desenhar();
    };
}

async function iniciarHistorico() {
    const [cs, ss] = await Promise.all([api.listarConteudos(), api.listarSessoes()]);

    const sessoes = ss.filter(s => cs.some(c => c.id_tmdb === s.id_tmdb));
    const contagem = {};
    sessoes.forEach(s => {
        contagem[s.id_tmdb] = (contagem[s.id_tmdb] || 0) + 1;
    });

    const reassistidos = Object.entries(contagem)
        .filter(([, vezes]) => vezes >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, vezes]) => ({ conteudo: cs.find(c => c.id_tmdb === Number(id)), vezes }));

    main.querySelector('#reassistidos').innerHTML = reassistidosHTML(reassistidos);
    main.querySelector('#sessoes').innerHTML = sessoes.length
        ? mesesHTML(sessoes, cs)
        : vazio('Nenhuma sessão registrada.');
}

async function iniciarDashboard() {
    const [cs, ss] = await Promise.all([api.listarConteudos(), api.listarSessoes()]);

    const q = f => cs.filter(f).length;
    const notas = cs.map(c => c.nota_pessoal).filter(Boolean);
    const media = notas.length
        ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1).replace('.0', '')
        : '–';
    const fila = q(c => c.status_biblioteca === 'Assistir Depois');
    const h = new Date().getHours();

    main.querySelector('#saudacao').textContent =
        h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!';

    main.querySelector('#resumo').textContent =
        `Você já registrou ${ss.length} sessões e tem ${fila} títulos esperando na fila.`;

    main.querySelector('#stats').innerHTML = [
        statHTML('▤', '#a78bfa', cs.length, `${q(c => c.tipo === 'filme')} filmes · ${q(c => c.tipo === 'serie')} séries`),
        statHTML('👁', '#34d399', q(c => c.status_biblioteca === 'Concluído'), 'Assistidos'),
        statHTML('◷', '#38bdf8', fila, 'Quero assistir'),
        statHTML('♡', '#f43f5e', q(c => c.favorito), 'Favoritos'),
        statHTML('☆', '#fbbf24', media, 'Nota média'),
    ].join('');

    const lista = (f, msg) => cs.filter(f).slice(0, 5).map(cardHTML).join('') || vazio(msg);

    main.querySelector('#recentes').innerHTML =
        [...cs].sort((a, b) => b.adicionado - a.adicionado).slice(0, 5).map(cardHTML).join('')
        || vazio('Nenhum título adicionado ainda.');

    main.querySelector('#favs').innerHTML =
        lista(c => c.favorito, 'Marque títulos com ♡ para vê-los aqui.');

    main.querySelector('#fila').innerHTML =
        lista(c => c.status_biblioteca === 'Assistir Depois', 'Sua fila está vazia.');

    main.querySelector('#ultimas').innerHTML =
        ss.slice(0, 4).map(s => sessaoHTML(s, cs.find(c => c.id_tmdb === s.id_tmdb))).join('')
        || vazio('Nenhuma sessão registrada.');
}

main.addEventListener('click', async e => {
    const mudar = e.target.closest('[data-mudar-estado]');
    const remover = e.target.closest('[data-remover]');
    if (!mudar && !remover) return;

    if (mudar) await api.mudarEstado(Number(mudar.dataset.id), mudar.dataset.mudarEstado);
    if (remover) await api.removerConteudo(Number(remover.dataset.remover));

    navegar();
});

main.addEventListener('click', async e => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    await api.alternarFavorito(Number(btn.dataset.fav));
    if (redesenhar) redesenhar(); else navegar();
});

main.addEventListener('click', async e => {
    const btn = e.target.closest('[data-remover-sessao]');
    if (!btn) return;
    await api.removerSessao(Number(btn.dataset.removerSessao));
    navegar();
});

main.addEventListener('click', async e => {
    if (e.target.closest('[data-voltar]')) {
        history.back();
        return;
    }
    const registrar = e.target.closest('[data-registrar]');
    if (registrar) {
        abrirModalSessao(Number(registrar.dataset.registrar));
        return;
    }

    const avaliar = e.target.closest('[data-avaliar]');
    if (avaliar) {
        abrirModalAvaliacao(Number(avaliar.dataset.avaliar));
        return;
    }

    const removerNota = e.target.closest('[data-remover-nota]');
    if (removerNota) {
        await api.avaliarConteudo(Number(removerNota.dataset.removerNota), null);
        navegar();
        return;
    }

    const comentar = e.target.closest('[data-comentar]');
    if (comentar) {
        abrirModalComentario(Number(comentar.dataset.comentar));
        return;
    }

    const verMais = e.target.closest('[data-ver-mais]');
    if (verMais) {
        const passo = Number(verMais.dataset.passo);
        const lista = verMais.previousElementSibling;
        lista.querySelectorAll('.sessao-det[hidden]').forEach((el, i) => {
            if (i < passo) el.hidden = false;
        });

        const restantes = lista.querySelectorAll('.sessao-det[hidden]').length;
        if (restantes) verMais.textContent = `Ver mais (${restantes})`;
        else verMais.remove();
        return;
    }

    const excluir = e.target.closest('[data-excluir]');
    if (excluir) {
        await api.removerConteudo(Number(excluir.dataset.excluir));
        location.hash = '#colecao';
        return;
    }
    const cab = e.target.closest('[data-temporada]');
    if (cab) {
        const area = cab.nextElementSibling;
        const abrir = area.hidden;
        area.hidden = !abrir;
        cab.setAttribute('aria-expanded', abrir);

        if (abrir && !area.dataset.carregado) {
            area.innerHTML = vazio('Carregando...');
            try {
                const t = await api.temporada(Number(cab.dataset.serie), Number(cab.dataset.temporada));
                area.innerHTML = episodiosHTML(t.episodios);
                area.dataset.carregado = '1';
            } catch (erro) {
                area.innerHTML = vazio(erro.message);
            }
        }
        return;
    }
    const alvo = e.target.closest('[data-href]');
    if (alvo && !e.target.closest('button')) {
        location.hash = alvo.dataset.href;
    }
});

main.addEventListener('change', async e => {
    const seletor = e.target.closest('[data-estado-select]');
    if (!seletor) return;
    await api.mudarEstado(Number(seletor.dataset.estadoSelect), seletor.value);
});

const modal = document.getElementById('modal-adicionar');
const formAdicionar = document.getElementById('form-adicionar');
const campoTitulo = document.getElementById('campo-titulo');
const listaResultados = document.getElementById('resultados');
const etapaBusca = document.getElementById('etapa-busca');
const etapaConfig = document.getElementById('etapa-config');
const btnSalvar = document.getElementById('btn-salvar');
const erroModal = document.getElementById('modal-erro');

let tipoAtual = 'filme';
let escolhido = null;
let temporizador = null;
let ultimaBusca = 0;

function mostrarEtapa(etapa) {
    etapaBusca.hidden = etapa !== 'busca';
    etapaConfig.hidden = etapa !== 'config';
    btnSalvar.disabled = etapa !== 'config';
    erroModal.hidden = true;
}

async function buscar() {
    const termo = campoTitulo.value.trim();
    const numero = ++ultimaBusca;

    if (termo.length < 2) {
        listaResultados.innerHTML = '';
        return;
    }

    listaResultados.innerHTML = vazio('Buscando...');
    try {
        const dados = await api.buscarTmdb(termo, tipoAtual);
        if (numero !== ultimaBusca) return;
        listaResultados.innerHTML = dados.results.length
            ? dados.results.map(resultadoHTML).join('')
            : vazio('Nenhum título encontrado.');
    } catch (erro) {
        if (numero !== ultimaBusca) return;
        listaResultados.innerHTML = vazio(erro.message);
    }
}

function definirTipo(tipo) {
    tipoAtual = tipo;
    modal.querySelectorAll('.alternar-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tipo === tipo);
    });
    buscar();
}

function abrirModal() {
    formAdicionar.reset();
    escolhido = null;
    listaResultados.innerHTML = '';
    definirTipo('filme');
    mostrarEtapa('busca');
    modal.showModal();
    campoTitulo.focus();
}

document.getElementById('btn-adicionar').addEventListener('click', abrirModal);

campoTitulo.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(buscar, 300);
});

document.getElementById('trocar-titulo').addEventListener('click', () => {
    escolhido = null;
    mostrarEtapa('busca');
    campoTitulo.focus();
});

modal.addEventListener('click', async e => {
    if (e.target.closest('[data-fechar]') || e.target === modal) {
        modal.close();
        return;
    }

    const tipo = e.target.closest('[data-tipo]');
    if (tipo) {
        definirTipo(tipo.dataset.tipo);
        return;
    }

    const item = e.target.closest('[data-resultado]');
    if (item) {
        try {
            escolhido = await api.detalhes(tipoAtual, Number(item.dataset.resultado));
            document.getElementById('escolhido').innerHTML = escolhidoHTML(escolhido);
            mostrarEtapa('config');
        } catch (erro) {
            erroModal.textContent = erro.message;
            erroModal.hidden = false;
        }
    }
});

formAdicionar.addEventListener('submit', async e => {
    e.preventDefault();
    if (!escolhido) return;

    const dados = new FormData(formAdicionar);
    const salvo = await api.adicionarConteudo(escolhido, {
        status_biblioteca: dados.get('status_biblioteca'),
        favorito: dados.get('favorito') === 'on',
    });

    if (!salvo) {
        erroModal.textContent = 'Esse título já está na sua biblioteca.';
        erroModal.hidden = false;
        return;
    }

    modal.close();
    navegar();
});

document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => {
        if (e.target.closest('[data-fechar]') || e.target === d) d.close();
    });
});

const modalSessao = document.getElementById('modal-sessao');
const formSessao = document.getElementById('form-sessao');
let conteudoSessao = null;

async function abrirModalSessao(id) {
    conteudoSessao = await api.buscarConteudo(id);
    formSessao.reset();
    document.getElementById('sessao-data').value = new Date().toLocaleDateString('en-CA');
    document.getElementById('sessao-sub').textContent =
        `Quando você assistiu ${conteudoSessao.titulo}? Se quiser, deixe um comentário desta vez.`;
    modalSessao.showModal();
}

formSessao.addEventListener('submit', async e => {
    e.preventDefault();
    const dados = new FormData(formSessao);
    await api.registrarSessao(conteudoSessao.id_tmdb, {
        data: dados.get('data'),
        comentario: dados.get('comentario').trim(),
    });
    modalSessao.close();
    navegar();
});

const modalAvaliacao = document.getElementById('modal-avaliacao');
const formAvaliacao = document.getElementById('form-avaliacao');
const notasAvaliacao = document.getElementById('avaliacao-notas');
const btnSalvarAvaliacao = document.getElementById('btn-salvar-avaliacao');
let conteudoAvaliacao = null;
let notaAvaliacao = null;

notasAvaliacao.innerHTML = Array.from({ length: 11 }, (_, n) =>
    `<button type="button" class="chip" data-nota="${n}">${n}</button>`
).join('');

function marcarNota(n) {
    notaAvaliacao = n;
    notasAvaliacao.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', Number(c.dataset.nota) === n);
    });
    btnSalvarAvaliacao.disabled = n === null;
}

async function abrirModalAvaliacao(id) {
    conteudoAvaliacao = await api.buscarConteudo(id);
    document.getElementById('avaliacao-titulo').textContent = `Avaliar ${conteudoAvaliacao.titulo}`;
    marcarNota(conteudoAvaliacao.nota_pessoal ?? null);
    modalAvaliacao.showModal();
}

notasAvaliacao.addEventListener('click', e => {
    const btn = e.target.closest('[data-nota]');
    if (btn) marcarNota(Number(btn.dataset.nota));
});

formAvaliacao.addEventListener('submit', async e => {
    e.preventDefault();
    if (notaAvaliacao === null) return;
    await api.avaliarConteudo(conteudoAvaliacao.id_tmdb, notaAvaliacao);
    modalAvaliacao.close();
    navegar();
});

const modalComentario = document.getElementById('modal-comentario');
const formComentario = document.getElementById('form-comentario');
let sessaoComentario = null;

function abrirModalComentario(idSessao) {
    sessaoComentario = idSessao;
    formComentario.reset();
    modalComentario.showModal();
}

formComentario.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = new FormData(formComentario).get('comentario').trim();
    if (!texto) return;
    await api.adicionarComentario(sessaoComentario, texto);
    modalComentario.close();
    navegar();
});

window.addEventListener('hashchange', () => {
    window.scrollTo(0, 0);
    navegar();
});

navegar();