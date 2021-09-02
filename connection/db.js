const mysql = require('mysql2')

const connectionPool = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@nurhidayat97',
    database: 'db_rent_car'
})

module.exports = connectionPool