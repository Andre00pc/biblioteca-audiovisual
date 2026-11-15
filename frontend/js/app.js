import { api } from './api.js';
import { cardHTML, statHTML, sessaoHTML, resultadoHTML, escolhidoHTML, vazio } from './ui.js';

const main = document.getElementById('main-content');

const ROTAS = {
    'dashboard':       { view: 'dashboard',       init: iniciarDashboard },
    'colecao':         { view: 'colecao',         init: () => grade(() => true) },
    'filmes':          { view: 'filmes',          init: () => grade(c => c.tipo === 'filme') },
    'series':          { view: 'series',          init: () => grade(c => c.tipo === 'serie') },
    'assistir-depois': { view: 'assistir-depois', init: () => grade(c => c.status_biblioteca === 'Assistir Depois') },
    'historico':       { view: 'historico',       init: iniciarHistorico },
    'favoritos':       { view: 'favoritos',       init: () => grade(c => c.favorito) },
};

async function navegar() {
    const rota = ROTAS[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
    const r = ROTAS[rota];

    document.querySelectorAll('#menu a').forEach(a => {
        a.classList.toggle('active', a.dataset.route === rota);
    });

    main.innerHTML = await fetch(`views/${r.view}.html`).then(res => res.text());
    await r.init();
}

async function grade(filtro) {
    const lista = (await api.listarConteudos()).filter(filtro);
    main.querySelector('#grid').innerHTML = lista.length
        ? lista.map(cardHTML).join('')
        : vazio('Nada por aqui ainda.');
}

async function iniciarHistorico() {
    const [cs, ss] = await Promise.all([api.listarConteudos(), api.listarSessoes()]);
    main.querySelector('#sessoes').innerHTML = ss.length
        ? ss.map(s => sessaoHTML(s, cs.find(c => c.id_tmdb === s.id_tmdb))).join('')
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
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    await api.alternarFavorito(Number(btn.dataset.fav));
    navegar();
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

window.addEventListener('hashchange', navegar);
navegar();
window.addEventListener('hashchange', navegar);
navegar();