const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
}[m]));

const STATUS = {
    'Assistir Depois': ['Quero assistir', 'fila'],
    'Assistindo':      ['Assistindo', 'andamento'],
    'Concluído':       ['Assistido', 'ok'],
};

export function anos(c) {
    if (c.tipo === 'filme') return c.ano_inicio;
    const fim = c.ano_fim && c.ano_fim !== c.ano_inicio ? '–' + c.ano_fim : '–';
    return `${c.ano_inicio}${fim}`;
}

export function fmtData(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function posterStyle(c) {
    if (c.poster_url) return `background-image:url('${esc(c.poster_url)}')`;
    return 'background-color:var(--surface)';
}

export function cardHTML(c) {
    const [label, cls] = STATUS[c.status_biblioteca];
    return `
    <article class="card">
      <div class="poster" style="${posterStyle(c)}">
        ${c.poster_url ? '' : `<div class="poster-fallback">${esc(c.titulo)}</div>`}
        <button class="fav-btn ${c.favorito ? 'on' : ''}" data-fav="${c.id_tmdb}" aria-label="Favoritar ${esc(c.titulo)}">
          ${c.favorito ? '♥' : '♡'}
        </button>
        <div class="poster-meta">
          <span class="badge ${cls}">${label}</span>
          ${c.nota_pessoal ? `<span class="nota">* ${c.nota_pessoal}</span>` : ''}
        </div>
      </div>
      <h3>${esc(c.titulo)}</h3>
      <p>${c.tipo === 'filme' ? 'Filme' : 'Série'} · ${anos(c)}</p>
    </article>`;
}

export function statHTML(icone, cor, valor, rotulo) {
    return `
    <div class="stat" style="--c:${cor}">
      <div class="stat-icon">${icone}</div>
      <strong>${valor}</strong>
      <span>${rotulo}</span>
    </div>`;
}

export function sessaoHTML(s, c) {
    return `
    <div class="sessao">
      <div class="sessao-thumb" style="${posterStyle(c)}"></div>
      <div class="sessao-info">
        <h3>${esc(c.titulo)}</h3>
        <p>${fmtData(s.data)}${s.comentario ? ` · “${esc(s.comentario)}”` : ''}</p>
      </div>
      ${s.nota ? `<span class="nota">* ${s.nota}</span>` : ''}
    </div>`;
}

export const vazio = msg => `<div class="vazio">${esc(msg)}</div>`;