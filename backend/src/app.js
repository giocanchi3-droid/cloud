require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { pool } = require('./db');
const productsRoutes = require('./routes/products.routes');
const {
  notFoundHandler,
  errorHandler,
} = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN === '*'
    ? true
    : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      service: 'stock-zapatos-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/products', productsRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;