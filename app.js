const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();
const { S3Client } = require('@aws-sdk/client-s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const port = 3000;

// Set up MySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
});

// Check for missing environment variables
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('Missing required environment variables for database connection');
    process.exit(1);
}

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.S3_BUCKET_NAME) {
    console.error('Missing required AWS environment variables');
    process.exit(1);
}

// AWS S3 client (AWS SDK v3)
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION
});

// Middleware for static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Set the view engine
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    const query = 'SELECT * FROM products';
    db.query(query, async (err, results) => {
        if (err) {
            console.error('Error fetching data from database:', err);
            res.status(500).send('Database error');
            return;
        }

        try {
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: 'banner.jpg' // Replace with your file's key in the bucket
            });

            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

            res.render('index', { products: results, bannerUrl: url });
        } catch (err) {
            console.error('Error fetching static file from S3:', err);
            res.status(500).send('S3 error');
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.end(() => {
        console.log('MySQL connections closed');
        process.exit(0);
    });
});
