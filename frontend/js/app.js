import { api } from './api.js';
import { cardHTML, statHTML, sessaoHTML, vazio } from './ui.js';

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

    //todo: procurar ícones
    main.querySelector('#stats').innerHTML = [
        statHTML('**', '#a78bfa', cs.length, `${q(c => c.tipo === 'filme')} filmes · ${q(c => c.tipo === 'serie')} séries`),
        statHTML('**', '#34d399', q(c => c.status_biblioteca === 'Concluído'), 'Assistidos'),
        statHTML('**', '#38bdf8', fila, 'Quero assistir'),
        statHTML('<3', '#f43f5e', q(c => c.favorito), 'Favoritos'),
        statHTML('**', '#fbbf24', media, 'Nota média'),
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

// Favoritar
main.addEventListener('click', async e => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    await api.alternarFavorito(Number(btn.dataset.fav));
    navegar();
});

window.addEventListener('hashchange', navegar);
navegar();