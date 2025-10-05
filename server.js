const express = require('express');

const app = express();

const port = 4000;

const start = async () => {
  try {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }             
};

start();

app.get('/', (req, res) => {
  res.send('Testing');
});