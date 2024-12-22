A simple **Node.js app** that integrates with a MySQL database and serves static files stored in an S3 bucket.

---

### **App Features**

1. Connects to a MySQL database to fetch and display information.
2. Serves static files (like images or CSS) hosted on an S3 bucket.
3. Displays a list of items from the database on the homepage.

---

### **Folder Structure**

```
nodejs-app/
├── app.js            # Main application file
├── public/           # Local folder for testing static files
├── views/            # EJS templates for rendering HTML
│   └── index.ejs
├── package.json      # Project dependencies
└── .env              # Environment variables
```

---

### **Step 1: Set Up the MySQL Database**

1. Create a table called `products` in your MySQL database:

    ```sql
    CREATE DATABASE node_js_app;

    USE node_js_app;
    
    CREATE TABLE products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2)
    );

    INSERT INTO products (name, description, price)
    VALUES
    ('Product 1', 'Description of Product 1', 19.99),
    ('Product 2', 'Description of Product 2', 29.99),
    ('Product 3', 'Description of Product 3', 39.99);
    ```

---

### **Step 2: Application Code**

#### **app.js**

```javascript
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
```

---

#### **index.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Node.js App</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <header>
        <h1>Welcome to the Node.js App</h1>
        <img src="<%= bannerUrl %>" alt="Banner Image" style="width: 100%; max-height: 300px;">
    </header>
    <main>
        <h2>Product List</h2>
        <ul>
            <% products.forEach(product => { %>
                <li>
                    <h3><%= product.name %></h3>
                    <p><%= product.description %></p>
                    <p>Price: $<%= product.price %></p>
                </li>
            <% }); %>
        </ul>
    </main>
</body>
</html>
```

---

#### **.env**

```env
DB_HOST=your-database-host
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region
S3_BUCKET_NAME=your-s3-bucket-name
```

---

#### **style.css (Optional)**

Create a simple stylesheet in `public/style.css`:

```css
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
}

header {
    text-align: center;
    background-color: #f4f4f4;
    padding: 20px;
}

main {
    padding: 20px;
}

ul {
    list-style-type: none;
    padding: 0;
}

li {
    margin-bottom: 20px;
    padding: 10px;
    border: 1px solid #ddd;
}
```

---

### **Step 3: Static Files in S3**

1. Upload static files like `banner.jpg` to your S3 bucket.
2. Ensure the S3 bucket allows public access for the files or set up a signed URL mechanism (as shown in the `app.js`).

---

### **Step 4: Run the Application**

1. Install dependencies:

    ```bash
    npm install express mysql aws-sdk dotenv ejs @aws-sdk/client-s3 @aws-sdk/client-rds @aws-sdk/s3-request-presigner
    ```

2. Start the app:

    ```bash
    node app.js
    ```

3. Visit `http://localhost:3000` to view the app.

---

### **Step 5: Deployment**

1. Package the application and deploy it to AWS EC2 instances in **both primary and secondary regions**.
2. Sync static files with S3:

    ```bash
    aws s3 sync ./public s3://your-s3-bucket-name/static/
    ```

---
