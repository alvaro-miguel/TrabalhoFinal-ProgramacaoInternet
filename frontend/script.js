const API_URL = '/api';
let professorLogado = null;
let alunoSelecionado = null;
let divisaoSelecionada = null;
let ordenacaoAtual = localStorage.getItem('fichaDigital_ordenacao') || 'nome';


function initTema() {
    const temaSalvo = localStorage.getItem('fichaDigital_tema') || 'light';
    aplicarTema(temaSalvo);
}

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    document.getElementById('btnTema').textContent = tema === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('fichaDigital_tema', tema);
}

function toggleTema() {
    const atual = document.documentElement.getAttribute('data-theme');
    const novo = atual === 'dark' ? 'light' : 'dark';
    aplicarTema(novo);
}

function updateStatus(online) {
    const status = document.getElementById('onlineStatus');
    if (online) {
        status.textContent = '● Online';
        status.className = 'status-online';
    } else {
        status.textContent = '● Offline';
        status.className = 'status-offline';
    }
}


function salvarCache(chave, dados) {
    try {
        localStorage.setItem(`fichaDigital_cache_${chave}`, JSON.stringify({ dados, timestamp: Date.now() }));
    } catch (e) {}
}
function obterCache(chave) {
    try {
        const item = localStorage.getItem(`fichaDigital_cache_${chave}`);
        if (item) return JSON.parse(item).dados;
    } catch (e) {}
    return null;
}

async function apiRequest(url, options = {}) {
    const cacheKey = url.replace(/[^a-zA-Z0-9]/g, '_');
    try {
        const response = await fetch(`${API_URL}${url}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Resposta não é JSON (status ${response.status}): ${text.substring(0, 100)}`);
        }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro na requisição');
        }
        const data = await response.json();
        if (options.method === 'GET' || !options.method) {
            salvarCache(cacheKey, data);
        }
        updateStatus(true);
        return data;
    } catch (error) {
        console.error('Erro na requisição:', error);
        updateStatus(false);
        if (options.method === 'GET' || !options.method) {
            const cached = obterCache(cacheKey);
            if (cached) return cached;
        }
        throw error;
    }
}


function mostrarTela(id) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}


async function fazerLogin(username, senha) {
    try {
        const professor = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ username, senha })
        });
        professorLogado = professor;
        localStorage.setItem('professorLogado', JSON.stringify(professor));
        document.getElementById('userInfo').textContent = `Olá, ${professor.nome}`;
        document.getElementById('btnLogout').style.display = 'inline-block';
        mostrarTela('telaAlunos');
        carregarAlunos();
        document.getElementById('loginError').style.display = 'none';
    } catch (error) {
        document.getElementById('loginError').textContent = error.message;
        document.getElementById('loginError').style.display = 'block';
    }
}

function logout() {
    professorLogado = null;
    localStorage.removeItem('professorLogado');
    document.getElementById('userInfo').textContent = '';
    document.getElementById('btnLogout').style.display = 'none';
    mostrarTela('telaLogin');
    document.getElementById('formLogin').reset();
}


async function carregarAlunos() {
    if (!professorLogado) return;
    try {
        const alunos = await apiRequest(`/professores/${professorLogado.id}/alunos`);
        renderAlunos(alunos);
    } catch (error) {
        alert('Erro ao carregar alunos: ' + error.message);
    }
}

function renderAlunos(alunos) {
    const container = document.getElementById('listaAlunos');
    if (!alunos || alunos.length === 0) {
        container.innerHTML = '<p class="loading">Nenhum aluno cadastrado.</p>';
        return;
    }
    container.innerHTML = alunos.map(aluno => `
        <div class="aluno-item" data-id="${aluno.id}">
            <span class="nome">${escapeHtml(aluno.nome)}</span>
            <span style="margin-left: auto; color: var(--text-secondary); font-size: 14px;">➡️</span>
            <button class="btn-remover-aluno" data-id="${aluno.id}" title="Remover aluno">✕</button>
        </div>
    `).join('');
}

document.addEventListener('click', function(e) {
    const btnRemover = e.target.closest('.btn-remover-aluno');
    if (btnRemover) {
        const id = parseInt(btnRemover.dataset.id);
        if (id) removerAluno(id);
        e.preventDefault();
        return;
    }

    const item = e.target.closest('.aluno-item');
    if (item) {
        const id = parseInt(item.dataset.id);
        if (id && !isNaN(id)) {
            const nomeEl = item.querySelector('.nome');
            if (nomeEl) {
                const nome = nomeEl.textContent.trim();
                alunoSelecionado = { id, nome };
                entrarFichaAluno(id, nome);
            }
        }
        e.preventDefault();
        return;
    }

});

async function adicionarAluno() {
    const input = document.getElementById('inputAlunoNome');
    const nome = input.value.trim();
    if (!nome) {
        alert('Digite o nome do aluno');
        return;
    }
    try {
        await apiRequest(`/professores/${professorLogado.id}/alunos`, {
            method: 'POST',
            body: JSON.stringify({ nome })
        });
        input.value = '';
        carregarAlunos();
    } catch (error) {
        alert('Erro ao adicionar aluno: ' + error.message);
    }
}

async function removerAluno(id) {
    if (!confirm('Tem certeza que deseja remover este aluno e todas as suas fichas?')) return;
    try {
        await apiRequest(`/alunos/${id}`, { method: 'DELETE' });
        carregarAlunos();
        if (alunoSelecionado && alunoSelecionado.id === id) {
            alunoSelecionado = null;
            mostrarTela('telaAlunos');
        }
    } catch (error) {
        alert('Erro ao remover aluno: ' + error.message);
    }
}

function entrarFichaAluno(alunoId, nomeAluno) {
    document.getElementById('nomeAluno').textContent = nomeAluno;
    mostrarTela('telaTreino');
    carregarDivisoes(alunoId);
    document.getElementById('exerciciosContainer').innerHTML = `
        <div class="empty-state">
            <h3>Selecione uma divisão</h3>
            <p>Clique em uma divisão para ver os exercícios</p>
        </div>
    `;
    divisaoSelecionada = null;
}


async function carregarDivisoes(alunoId) {
    try {
        const divisoes = await apiRequest(`/alunos/${alunoId}/divisoes`);
        renderDivisoes(divisoes, alunoId);
    } catch (error) {
        alert('Erro ao carregar divisões: ' + error.message);
    }
}

function renderDivisoes(divisoes, alunoId) {
    const container = document.getElementById('listaDivisoes');
    if (!divisoes || divisoes.length === 0) {
        container.innerHTML = '<p class="loading">Nenhuma divisão criada</p>';
        return;
    }
    container.innerHTML = divisoes.map(div => `
        <div class="divisao-item ${divisaoSelecionada && divisaoSelecionada.id === div.id ? 'active' : ''}"
             data-id="${div.id}">
            <div class="info" data-id="${div.id}">
                <div class="nome">${escapeHtml(div.nome)}</div>
                ${div.descricao ? `<div class="desc">${escapeHtml(div.descricao)}</div>` : ''}
            </div>
            <button class="btn-remover" data-id="${div.id}" title="Remover divisão">✕</button>
        </div>
    `).join('');
}

document.addEventListener('click', function(e) {
    const infoDiv = e.target.closest('.divisao-item .info');
    if (infoDiv) {
        const item = infoDiv.closest('.divisao-item');
        const id = parseInt(item.dataset.id);
        if (id && alunoSelecionado) {
            selecionarDivisao(id, alunoSelecionado.id);
        }
        e.preventDefault();
        return;
    }

    const btnRemoverDiv = e.target.closest('.divisao-item .btn-remover');
    if (btnRemoverDiv) {
        const item = btnRemoverDiv.closest('.divisao-item');
        const id = parseInt(item.dataset.id);
        if (id && alunoSelecionado) {
            removerDivisao(id, alunoSelecionado.id);
        }
        e.preventDefault();
        return;
    }
});

async function selecionarDivisao(divisaoId, alunoId) {
    try {
        const divisoes = await apiRequest(`/alunos/${alunoId}/divisoes`);
        const div = divisoes.find(d => d.id === divisaoId);
        if (div) {
            divisaoSelecionada = div;
            carregarExercicios(alunoId, divisaoId);
            renderDivisoes(divisoes, alunoId);
        }
    } catch (error) {
        alert('Erro ao selecionar divisão: ' + error.message);
    }
}

async function adicionarDivisao() {
    if (!alunoSelecionado) return;
    const nomeInput = document.getElementById('inputDivisaoNome');
    const descInput = document.getElementById('inputDivisaoDesc');
    const nome = nomeInput.value.trim();
    const descricao = descInput.value.trim();
    if (!nome) {
        alert('Nome da divisão é obrigatório');
        nomeInput.focus();
        return;
    }
    try {
        const nova = await apiRequest(`/alunos/${alunoSelecionado.id}/divisoes`, {
            method: 'POST',
            body: JSON.stringify({ nome, descricao })
        });
        nomeInput.value = '';
        descInput.value = '';
        await carregarDivisoes(alunoSelecionado.id);
        divisaoSelecionada = nova;
        await selecionarDivisao(nova.id, alunoSelecionado.id);
    } catch (error) {
        alert('Erro ao adicionar divisão: ' + error.message);
    }
}

async function removerDivisao(divisaoId, alunoId) {
    if (!confirm('Remover esta divisão e todos os exercícios?')) return;
    try {
        await apiRequest(`/alunos/${alunoId}/divisoes/${divisaoId}`, { method: 'DELETE' });
        if (divisaoSelecionada && divisaoSelecionada.id === divisaoId) {
            divisaoSelecionada = null;
            document.getElementById('exerciciosContainer').innerHTML = `
                <div class="empty-state">
                    <h3>Selecione uma divisão</h3>
                    <p>Clique em uma divisão para ver os exercícios</p>
                </div>
            `;
        }
        await carregarDivisoes(alunoId);
    } catch (error) {
        alert('Erro ao remover divisão: ' + error.message);
    }
}


async function carregarExercicios(alunoId, divisaoId, manterScroll = false) {
    try {
        const ordenacao = document.getElementById('ordenacaoExercicios')?.value || 'nome';
        ordenacaoAtual = ordenacao;
        localStorage.setItem('fichaDigital_ordenacao', ordenacao);
        const exercicios = await apiRequest(
            `/alunos/${alunoId}/divisoes/${divisaoId}/exercicios?ordenar=${ordenacao}`
        );
        let scrollPos = 0;
        if (manterScroll) {
            const container = document.getElementById('exerciciosContainer');
            scrollPos = container.scrollTop || 0;
        }
        renderExercicios(exercicios, alunoId, divisaoId);
        if (manterScroll) {
            const container = document.getElementById('exerciciosContainer');
            if (container) setTimeout(() => container.scrollTop = scrollPos, 10);
        }
    } catch (error) {
        alert('Erro ao carregar exercícios: ' + error.message);
    }
}

function renderExercicios(exercicios, alunoId, divisaoId) {
    const container = document.getElementById('exerciciosContainer');
    const divNome = divisaoSelecionada ? escapeHtml(divisaoSelecionada.nome) : '';
    let totalSeries = 0;
    if (exercicios) totalSeries = exercicios.reduce((sum, ex) => sum + (ex.series || 0), 0);

    let html = `
        <div class="exercicios-header">
            <h2>${divNome}</h2>
            <div class="exercicios-controls">
                <label for="ordenacaoExercicios">Ordenar:</label>
                <select id="ordenacaoExercicios" onchange="mudarOrdenacao(${alunoId}, ${divisaoId})">
                    <option value="nome" ${ordenacaoAtual === 'nome' ? 'selected' : ''}>Nome</option>
                    <option value="grupo" ${ordenacaoAtual === 'grupo' ? 'selected' : ''}>Grupo</option>
                    <option value="carga" ${ordenacaoAtual === 'carga' ? 'selected' : ''}>Carga</option>
                </select>
            </div>
        </div>
    `;

    if (!exercicios || exercicios.length === 0) {
        html += `<div class="empty-state" style="height:150px;"><p>Nenhum exercício</p></div>`;
    } else {
        html += `<div class="exercicios-list">`;
        exercicios.forEach(ex => {
            html += `
                <div class="exercicio-item" data-id="${ex.id}">
                    <span class="campo nome">${escapeHtml(ex.nome)}</span>
                    <span class="campo">${escapeHtml(ex.grupo_muscular || 'Geral')}</span>
                    <div class="campo">
                        <input type="number" value="${ex.series}" min="1" max="10"
                               onchange="atualizarExercicio(${ex.id}, 'series', this.value, ${alunoId}, ${divisaoId})">
                        séries
                    </div>
                    <div class="campo">
                        <input type="number" value="${ex.repeticoes || ''}" min="1" max="30"
                               onchange="atualizarExercicio(${ex.id}, 'repeticoes', this.value, ${alunoId}, ${divisaoId})">
                        reps
                    </div>
                    <div class="campo">
                        <input type="number" value="${ex.carga || ''}" min="0" step="2.5"
                               onchange="atualizarExercicio(${ex.id}, 'carga', this.value, ${alunoId}, ${divisaoId})">
                        kg
                    </div>
                    <button class="btn-remover-exercicio" onclick="removerExercicio(${ex.id}, ${alunoId}, ${divisaoId})">✕</button>
                </div>
            `;
        });
        html += `</div>`;
    }

    html += `
        <div class="total-series">
            Total de séries: <strong>${totalSeries}</strong> 
            ${totalSeries > 27 ? '<span class="excedido">⚠️ LIMITE EXCEDIDO (27)</span>' :
              totalSeries > 20 ? `<span class="limite">⚠️ Próximo do limite (${27 - totalSeries} restantes)</span>` :
              `<span style="color: var(--text-secondary)">(limite: 27)</span>`}
        </div>
    `;

    html += `
        <div class="form-exercicio">
            <input type="text" id="inputExNome" placeholder="Nome do exercício" maxlength="50">
            <input type="text" id="inputExGrupo" placeholder="Grupo muscular" maxlength="30">
            <input type="number" id="inputExSeries" placeholder="Séries" min="1" max="10">
            <input type="number" id="inputExReps" placeholder="Repetições" min="1" max="30">
            <input type="number" id="inputExCarga" placeholder="Carga (kg)" min="0" step="2.5">
            <button class="btn-primary" onclick="adicionarExercicio(${alunoId}, ${divisaoId})" type="button">+ Adicionar</button>
        </div>
    `;

    container.innerHTML = html;
}

async function mudarOrdenacao(alunoId, divisaoId) {
    ordenacaoAtual = document.getElementById('ordenacaoExercicios').value;
    localStorage.setItem('fichaDigital_ordenacao', ordenacaoAtual);
    await carregarExercicios(alunoId, divisaoId, true);
}

async function adicionarExercicio(alunoId, divisaoId) {
    const nome = document.getElementById('inputExNome').value.trim();
    const grupo = document.getElementById('inputExGrupo').value.trim();
    const series = parseInt(document.getElementById('inputExSeries').value);
    const repeticoes = parseInt(document.getElementById('inputExReps').value) || null;
    const carga = parseFloat(document.getElementById('inputExCarga').value) || null;

    if (!nome) { alert('Nome do exercício é obrigatório'); document.getElementById('inputExNome').focus(); return; }
    if (!series || series < 1) { alert('Séries deve ser maior que 0'); document.getElementById('inputExSeries').focus(); return; }

    try {
        await apiRequest(`/alunos/${alunoId}/divisoes/${divisaoId}/exercicios`, {
            method: 'POST',
            body: JSON.stringify({ nome, grupo_muscular: grupo, series, repeticoes, carga })
        });
        document.getElementById('inputExNome').value = '';
        document.getElementById('inputExGrupo').value = '';
        document.getElementById('inputExSeries').value = '';
        document.getElementById('inputExReps').value = '';
        document.getElementById('inputExCarga').value = '';
        await carregarExercicios(alunoId, divisaoId, true);
        document.getElementById('inputExNome').focus();
    } catch (error) {
        alert('Erro ao adicionar exercício: ' + error.message);
    }
}

async function atualizarExercicio(id, campo, valor, alunoId, divisaoId) {
    const data = {};
    if (campo === 'series') {
        const num = parseInt(valor);
        if (!num || num < 1) { alert('Séries deve ser > 0'); await carregarExercicios(alunoId, divisaoId, true); return; }
        data[campo] = num;
    } else if (campo === 'repeticoes') {
        data[campo] = valor ? parseInt(valor) : null;
    } else if (campo === 'carga') {
        data[campo] = valor ? parseFloat(valor) : null;
    }
    try {
        await apiRequest(`/alunos/${alunoId}/divisoes/${divisaoId}/exercicios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        await carregarExercicios(alunoId, divisaoId, true);
    } catch (error) {
        alert('Erro ao atualizar: ' + error.message);
        await carregarExercicios(alunoId, divisaoId, true);
    }
}

async function removerExercicio(id, alunoId, divisaoId) {
    if (!confirm('Remover este exercício?')) return;
    try {
        await apiRequest(`/alunos/${alunoId}/divisoes/${divisaoId}/exercicios/${id}`, {
            method: 'DELETE'
        });
        await carregarExercicios(alunoId, divisaoId, true);
    } catch (error) {
        alert('Erro ao remover exercício: ' + error.message);
    }
}


function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


document.addEventListener('DOMContentLoaded', () => {
    initTema();
    document.getElementById('btnTema').addEventListener('click', toggleTema);
    document.getElementById('btnLogout').addEventListener('click', logout);

    document.getElementById('formLogin').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('inputUsername').value;
        const senha = document.getElementById('inputSenha').value;
        fazerLogin(username, senha);
    });

    document.getElementById('btnAddAluno').addEventListener('click', adicionarAluno);
    document.getElementById('inputAlunoNome').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adicionarAluno();
    });

    document.getElementById('btnAddDivisao').addEventListener('click', adicionarDivisao);
    document.getElementById('inputDivisaoNome').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adicionarDivisao();
    });

    document.getElementById('btnVoltarAlunos').addEventListener('click', () => {
        alunoSelecionado = null;
        divisaoSelecionada = null;
        mostrarTela('telaAlunos');
        carregarAlunos();
    });

    const saved = localStorage.getItem('professorLogado');
    if (saved) {
        try {
            professorLogado = JSON.parse(saved);
            document.getElementById('userInfo').textContent = `Olá, ${professorLogado.nome}`;
            document.getElementById('btnLogout').style.display = 'inline-block';
            mostrarTela('telaAlunos');
            carregarAlunos();
        } catch (e) {
            logout();
        }
    } else {
        mostrarTela('telaLogin');
    }

    window.addEventListener('online', () => {
        updateStatus(true);
        if (professorLogado) carregarAlunos();
    });
    window.addEventListener('offline', () => updateStatus(false));
});

window.mudarOrdenacao = mudarOrdenacao;
window.adicionarExercicio = adicionarExercicio;
window.atualizarExercicio = atualizarExercicio;
window.removerExercicio = removerExercicio;