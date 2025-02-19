const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg'); // PostgreSQL client

const app = express();
const port = 3000;

// PostgreSQL connection pool
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'gis_project',
  password: '123456789',
  port: 5432,
});

// Middleware for cross-origin requests
app.use(cors());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Route for file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = path.join(__dirname, 'uploads', req.file.filename);

  try {
    // Insert file metadata into PostgreSQL
    const result = await pool.query(
      'INSERT INTO files (filename, filepath, uploaded_by) VALUES ($1, $2, $3) RETURNING id',
      [req.file.filename, filePath, 'Anonymous'] // Replace 'Anonymous' with real user data if needed
    );

    res.send(`File uploaded successfully: ${req.file.filename}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error uploading the file.');
  }
});

// Route to list files from PostgreSQL
app.get('/files', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM files');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving files.');
  }
});
// Route pour télécharger un fichier
app.get('/download/:id', async (req, res) => {
  const fileId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
    if (result.rows.length === 0) {
      return res.status(404).send('Fichier non trouvé.');
    }

    const filePath = result.rows[0].filepath;
    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors du téléchargement du fichier.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
