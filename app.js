// index.js or app.js
const app = require('./server');  // Import the Express app from server.js

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
