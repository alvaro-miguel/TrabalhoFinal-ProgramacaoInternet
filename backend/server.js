const express = require('express');
const cors = require('cors');
const alunoRoutes = require('./routes/alunoRoutes');
const { initDatabase } = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

initDatabase();

app.use('/api', alunoRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor rodando!' });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});