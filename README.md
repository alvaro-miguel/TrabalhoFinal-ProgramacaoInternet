# 🏋️‍♂️ FitOn

**Aplicação Full-Stack para Gerenciamento de Treinos**
Trabalho Final da disciplina de Programação Para a Internet I - Instituto Federal do Piauí (IFPI) - Campus Teresina Central.

**Professor:** Ely Miranda

**Equipe:** Alvaro Miguel Rodrigues e Francisco de Cássio Mourão

---

# 📌 Sobre o Projeto

O **FitOn** é um sistema voltado para o controle de volume de treinos em academias (como divisões Upper/Lower). A aplicação ajuda professores a montarem fichas para seus alunos, aplicando automaticamente regras de fisiologia esportiva para evitar o *overtraining*, limitando o volume total de séries por sessão.

O projeto foi construído utilizando apenas as tecnologias exigidas pela disciplina: **HTML, CSS, JavaScript (D.O.M), Node.js e Express.js**.

---

# 🎯 Atendimento aos Requisitos (Escopo da Disciplina)

Este projeto foi cuidadosamente desenhado para contemplar todos os **7 requisitos** solicitados no trabalho final:

## 1. Entidades 1:N (Mestre-Detalhe)

Estrutura em cascata:

```text
Professores (1)
    └── Alunos (N)
            └── Divisões de Treino (N)
                    └── Exercícios (N)
```

---

## 2. Regras de Negócio e Validação

### Cliente e Servidor

* Validação de campos obrigatórios.
* Nome do exercício não pode ser vazio.
* Quantidade de séries deve ser maior que zero.

### Servidor

Regra de negócio que impede o cadastro ou atualização de exercícios quando a soma total de séries da divisão ultrapassa o limite fisiológico de **27 séries**, protegendo o usuário contra o excesso de volume de treino (*overtraining*).

---

## 3. Métodos HTTP

Foram implementados os seguintes métodos HTTP na rota:

```text
/api/alunos/:alunoId/divisoes/:divisaoId/exercicios
```

* `GET` → Listagem
* `POST` → Cadastro
* `PUT` → Atualização
* `DELETE` → Remoção

---

## 4. Ordenação no Servidor

A API Express disponibiliza a query:

```text
?ordenar=
```

Permitindo ordenar os exercícios diretamente via SQL por:

* Nome
* Grupo Muscular
* Carga

---

## 5. Local Storage

Utilizado para:

* Persistência do tema (Dark/Light Mode);
* Cache das requisições `GET`, permitindo funcionamento offline básico;
* Salvamento da última forma de ordenação escolhida pelo usuário.

---

## 6. Persistência de Dados

Banco de dados relacional **SQLite**, utilizando:

* Chaves estrangeiras;
* `ON DELETE CASCADE`;
* Persistência em arquivo `.db`.

---

## 7. Deploy e Hospedagem

Aplicação hospedada em nuvem utilizando a plataforma **Render**, com o front-end servido estaticamente pelo próprio Express.

---

# 🛠️ Tecnologias Utilizadas

## Front-end

* HTML5
* CSS3
* JavaScript Vanilla (Manipulação direta do D.O.M)

## Back-end

* Node.js
* Express.js

## Banco de Dados

* SQLite3

## Hospedagem

* Render 

---

# 📂 Estrutura de Pastas

```text
/
├── backend/
│   ├── routes/
│   │   └── alunoRoutes.js      # Lógica das rotas da API HTTP
│   ├── database.js             # Conexão com SQLite e criação das tabelas
│   ├── server.js               # Inicialização do Express e entrega do Front-end
│   └── package.json            # Dependências (express, cors, sqlite3)
│
├── frontend/
│   ├── index.html              # Interface principal do sistema
│   ├── style.css               # Estilos, variáveis e responsividade
│   └── script.js               # Manipulação do D.O.M, Local Storage e consumo da API
│
├── .gitignore
└── README.md
```

---

# 🚀 Como Rodar o Projeto Localmente

## 1. Clone o repositório

```bash
git clone https://github.com/alvaro-miguel/TrabalhoFinal-ProgramacaoInternet.git
```

---

## 2. Acesse a pasta do backend

```bash
cd TrabalhoFinal-ProgramacaoInternet/backend
```

---

## 3. Instale as dependências

```bash
npm install
```

---

## 4. Inicie o servidor

```bash
node server.js
```

---

## 5. Acesse no navegador

```text
http://localhost:3000
```

---

# 🔑 Credenciais para Teste

Para facilitar a avaliação do sistema, utilize as seguintes credenciais:

**Usuário**

```text
professor
```

**Senha**

```text
admin123
```
