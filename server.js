const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/tracks', require('./src/routes/tracks'));
app.use('/api/ratings', require('./src/routes/ratings'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`radiocalico running at http://localhost:${PORT}`);
});
