require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet()); // Sécurité
app.use(cors()); // CORS
app.use(express.json()); // Parser JSON

// Routes de base
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the server at http://localhost:${PORT} or http://YOUR_LOCAL_IP:${PORT}`);
});
