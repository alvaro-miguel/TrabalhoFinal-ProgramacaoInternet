const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}


function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}


function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}


router.post('/login', async (req, res) => {
    try {
        const { username, senha } = req.body;
        if (!username || !senha) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        }
        if (username === 'professor' && senha === 'admin123') {
            const professor = {
                id: 1,
                nome: 'Professor',
                email: 'professor@teste.com'
            };
            res.json(professor);
        } else {
            res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/professores/:professorId/alunos', async (req, res) => {
    try {
        const { professorId } = req.params;
        const alunos = await allQuery(
            'SELECT * FROM alunos WHERE professor_id = ? ORDER BY nome',
            [professorId]
        );
        res.json(alunos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/professores/:professorId/alunos', async (req, res) => {
    try {
        const { professorId } = req.params;
        const { nome } = req.body;
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome do aluno é obrigatório' });
        }
        const result = await runQuery(
            'INSERT INTO alunos (nome, professor_id) VALUES (?, ?)',
            [nome.trim(), professorId]
        );
        const novoAluno = await getQuery('SELECT * FROM alunos WHERE id = ?', [result.id]);
        res.status(201).json(novoAluno);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.delete('/alunos/:alunoId', async (req, res) => {
    try {
        const { alunoId } = req.params;
        const result = await runQuery('DELETE FROM alunos WHERE id = ?', [alunoId]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        res.json({ message: 'Aluno removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/alunos/:alunoId/divisoes', async (req, res) => {
    try {
        const { alunoId } = req.params;
        const divisoes = await allQuery(
            'SELECT * FROM divisoes_treino WHERE aluno_id = ? ORDER BY data_criacao DESC',
            [alunoId]
        );
        res.json(divisoes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/alunos/:alunoId/divisoes', async (req, res) => {
    try {
        const { alunoId } = req.params;
        const { nome, descricao } = req.body;
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome da divisão é obrigatório' });
        }
        const result = await runQuery(
            'INSERT INTO divisoes_treino (aluno_id, nome, descricao) VALUES (?, ?, ?)',
            [alunoId, nome.trim(), descricao || '']
        );
        const novaDivisao = await getQuery('SELECT * FROM divisoes_treino WHERE id = ?', [result.id]);
        res.status(201).json(novaDivisao);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.delete('/alunos/:alunoId/divisoes/:divisaoId', async (req, res) => {
    try {
        const { alunoId, divisaoId } = req.params;
        const result = await runQuery(
            'DELETE FROM divisoes_treino WHERE id = ? AND aluno_id = ?',
            [divisaoId, alunoId]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Divisão não encontrada' });
        }
        res.json({ message: 'Divisão removida com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/alunos/:alunoId/divisoes/:divisaoId/exercicios', async (req, res) => {
    try {
        const { alunoId, divisaoId } = req.params;
        const { ordenar } = req.query;

        const divisao = await getQuery(
            'SELECT * FROM divisoes_treino WHERE id = ? AND aluno_id = ?',
            [divisaoId, alunoId]
        );
        if (!divisao) {
            return res.status(404).json({ error: 'Divisão não encontrada para este aluno' });
        }

        let orderBy = 'nome ASC';
        if (ordenar === 'grupo') orderBy = 'grupo_muscular ASC, nome ASC';
        else if (ordenar === 'carga') orderBy = 'carga DESC, nome ASC';

        const exercicios = await allQuery(
            `SELECT * FROM exercicios WHERE divisao_id = ? ORDER BY ${orderBy}`,
            [divisaoId]
        );
        res.json(exercicios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/alunos/:alunoId/divisoes/:divisaoId/exercicios', async (req, res) => {
    try {
        const { alunoId, divisaoId } = req.params;
        const { nome, grupo_muscular, series, repeticoes, carga } = req.body;

        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome do exercício é obrigatório' });
        }
        if (!series || series < 1) {
            return res.status(400).json({ error: 'Séries deve ser maior que 0' });
        }

        const divisao = await getQuery(
            'SELECT * FROM divisoes_treino WHERE id = ? AND aluno_id = ?',
            [divisaoId, alunoId]
        );
        if (!divisao) {
            return res.status(404).json({ error: 'Divisão não encontrada' });
        }

        const totalSeries = await allQuery(
            'SELECT SUM(series) as total FROM exercicios WHERE divisao_id = ?',
            [divisaoId]
        );
        const totalAtual = totalSeries[0]?.total || 0;
        const novoTotal = totalAtual + parseInt(series);
        if (novoTotal > 27) {
            return res.status(400).json({
                error: `Limite de séries excedido. Total atual: ${totalAtual}, máximo: 27`
            });
        }

        const result = await runQuery(
            `INSERT INTO exercicios (divisao_id, nome, grupo_muscular, series, repeticoes, carga)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [divisaoId, nome.trim(), grupo_muscular || 'Geral', parseInt(series),
             repeticoes ? parseInt(repeticoes) : null,
             carga ? parseFloat(carga) : null]
        );
        const novoExercicio = await getQuery('SELECT * FROM exercicios WHERE id = ?', [result.id]);
        res.status(201).json(novoExercicio);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/alunos/:alunoId/divisoes/:divisaoId/exercicios/:exercicioId', async (req, res) => {
    try {
        const { alunoId, divisaoId, exercicioId } = req.params;
        const { nome, grupo_muscular, series, repeticoes, carga } = req.body;

        const exercicio = await getQuery(
            `SELECT e.* FROM exercicios e
             JOIN divisoes_treino d ON e.divisao_id = d.id
             WHERE e.id = ? AND d.id = ? AND d.aluno_id = ?`,
            [exercicioId, divisaoId, alunoId]
        );
        if (!exercicio) {
            return res.status(404).json({ error: 'Exercício não encontrado' });
        }

        if (nome && nome.trim() === '') {
            return res.status(400).json({ error: 'Nome não pode ser vazio' });
        }

        if (series) {
            const totalSeries = await allQuery(
                'SELECT SUM(series) as total FROM exercicios WHERE divisao_id = ? AND id != ?',
                [divisaoId, exercicioId]
            );
            const totalAtual = totalSeries[0]?.total || 0;
            const novoTotal = totalAtual + parseInt(series);
            if (novoTotal > 27) {
                return res.status(400).json({
                    error: `Limite de séries excedido. Total atual sem este exercício: ${totalAtual}, máximo: 27`
                });
            }
        }

        const updates = [];
        const params = [];
        if (nome) { updates.push('nome = ?'); params.push(nome.trim()); }
        if (grupo_muscular) { updates.push('grupo_muscular = ?'); params.push(grupo_muscular); }
        if (series) { updates.push('series = ?'); params.push(parseInt(series)); }
        if (repeticoes !== undefined) { updates.push('repeticoes = ?'); params.push(repeticoes ? parseInt(repeticoes) : null); }
        if (carga !== undefined) { updates.push('carga = ?'); params.push(carga ? parseFloat(carga) : null); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(exercicioId);
        await runQuery(
            `UPDATE exercicios SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        const exercicioAtualizado = await getQuery('SELECT * FROM exercicios WHERE id = ?', [exercicioId]);
        res.json(exercicioAtualizado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.delete('/alunos/:alunoId/divisoes/:divisaoId/exercicios/:exercicioId', async (req, res) => {
    try {
        const { alunoId, divisaoId, exercicioId } = req.params;
        const exercicio = await getQuery(
            `SELECT e.* FROM exercicios e
             JOIN divisoes_treino d ON e.divisao_id = d.id
             WHERE e.id = ? AND d.id = ? AND d.aluno_id = ?`,
            [exercicioId, divisaoId, alunoId]
        );
        if (!exercicio) {
            return res.status(404).json({ error: 'Exercício não encontrado' });
        }

        const result = await runQuery('DELETE FROM exercicios WHERE id = ?', [exercicioId]);
        res.json({ message: 'Exercício removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;