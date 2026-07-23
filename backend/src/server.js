const app = require('./app');
const { verifyDatabase } = require('./db');

const PORT = Number(process.env.PORT || 8080);

async function startServer() {
  try {
    const databaseInfo = await verifyDatabase();

    console.log(
      'PostgreSQL conectado:',
      databaseInfo.current_time,
    );

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API ejecutándose en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error(
      'No fue posible iniciar la API:',
      error.message,
    );

    process.exit(1);
  }
}

startServer();