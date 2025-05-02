const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

// Create a unified database interface that works with both MongoDB and MySQL
class DatabaseInterface {
    constructor() {
        this.mongoConnection = null;
        this.mysqlConnection = null;
        this.useMongoDb = process.env.USE_MONGODB === 'true' || !!process.env.MONGODB_URI;
        this.useMySql = process.env.USE_MYSQL === 'true' || !!process.env.DB_HOST;
    }

    async connect() {
        try {
            // Connect to MongoDB if enabled
            if (this.useMongoDb) {
                await this.connectMongo();
            }
            
            // Connect to MySQL if enabled
            if (this.useMySql) {
                await this.connectMySQL();
            }
            
            // Ensure at least one database is connected
            if (!this.mongoConnection && !this.mysqlConnection) {
                console.error('No database connection established. Check your environment variables.');
                // Don't exit process in production, just log the error
                if (process.env.NODE_ENV !== 'production') {
                    process.exit(1);
                }
            }
            
            return this;
        } catch (err) {
            console.error(`Database connection error: ${err.message}`);
            // Don't exit process in production, just log the error
            if (process.env.NODE_ENV !== 'production') {
                process.exit(1);
            }
            return this;
        }
    }

    async connectMongo() {
        try {
            mongoose.set('strictQuery', false);
            
            // Try multiple MongoDB connection strings in order of preference
            const mongoUris = [
                process.env.MONGODB_URI,
                'mongodb+srv://rydoapp:RydoApp2025@cluster0.mongodb.net/rydo_db?retryWrites=true&w=majority',
                'mongodb://127.0.0.1:27017/rydo'
            ];
            
            let connected = false;
            let lastError = null;
            
            // Try each connection string until one works
            for (const uri of mongoUris) {
                if (!uri) continue;
                
                try {
                    console.log(`Attempting to connect to MongoDB with URI: ${uri.substring(0, 20)}...`);
                    const conn = await mongoose.connect(uri, {
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        serverSelectionTimeoutMS: 5000 // 5 second timeout
                    });
                    
                    this.mongoConnection = conn;
                    console.log(`MongoDB Connected: ${conn.connection.host}`);
                    connected = true;
                    break;
                } catch (err) {
                    console.error(`Failed to connect with this URI: ${err.message}`);
                    lastError = err;
                    // Continue to the next URI
                }
            }
            
            if (!connected) {
                throw lastError || new Error('All MongoDB connection attempts failed');
            }
        } catch (err) {
            console.error(`MongoDB Connection Error: ${err.message}`);
            this.mongoConnection = null;
            // Don't throw here, allow the app to try MySQL if available
        }
    }

    async connectMySQL() {
        try {
            this.mysqlConnection = await mysql.createPool({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'rydo_db',
                port: process.env.DB_PORT || 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log('MySQL Connected');
        } catch (err) {
            console.error(`MySQL Connection Error: ${err.message}`);
            this.mysqlConnection = null;
            // Don't throw here, allow the app to continue if MongoDB is available
        }
    }

    async query(sql, params) {
        if (!this.mysqlConnection) {
            console.error('MySQL connection not established');
            return [[], []];
        }
        return this.mysqlConnection.execute(sql, params);
    }

    getMongoConnection() {
        return this.mongoConnection;
    }
}

// Create and export a singleton instance
const db = new DatabaseInterface();
module.exports = db;
