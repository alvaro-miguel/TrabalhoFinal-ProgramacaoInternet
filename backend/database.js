const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ficha_digital.db');
let db;

function initDatabase() {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Erro ao conectar ao banco:', err);
        } else {
            console.log('Conectado ao SQLite');
            db.run('PRAGMA foreign_keys = ON;', (err) => {
                if(!err) createTables();
            });
        }
    });
}

function createTables() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS professores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS alunos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                professor_id INTEGER NOT NULL,
                data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (professor_id) REFERENCES professores(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS divisoes_treino (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluno_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                descricao TEXT,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS exercicios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                divisao_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                grupo_muscular TEXT NOT NULL,
                series INTEGER NOT NULL,
                repeticoes INTEGER,
                carga INTEGER,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (divisao_id) REFERENCES divisoes_treino(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) {
                console.error('Erro ao criar tabela exercicios:', err);
            } else {
                console.log('Tabelas criadas/verificadas com sucesso');
                insertSampleData();
            }
        });
    });
}

function insertSampleData() {
    db.get("SELECT * FROM professores WHERE email = 'prof@teste.com'", (err, row) => {
        if (!row) {
            db.run(
                "INSERT INTO professores (nome, email, senha) VALUES (?, ?, ?)",
                ['Professor Teste', 'prof@teste.com', '123456']
            );
        }
    });

    db.get("SELECT id FROM professores WHERE email = 'prof@teste.com'", (err, profRow) => {
        if (profRow) {
            const professorId = profRow.id;
            db.get("SELECT COUNT(*) as count FROM alunos WHERE professor_id = ?", [professorId], (err, row) => {
                if (row.count === 0) {
                    const alunos = ['João Silva', 'Maria Oliveira', 'Carlos Souza'];
                    alunos.forEach(nome => {
                        db.run(
                            "INSERT INTO alunos (nome, professor_id) VALUES (?, ?)",
                            [nome, professorId]
                        );
                    });
                }
            });
        }
    });
}

function getDb() {
    return db;
}

module.exports = { initDatabase, getDb };