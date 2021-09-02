const express = require('express')
const http = require('http')
const path = require('path')
const hbs = require('hbs')
const session = require('express-session')

const app = express()
const port = 3000
const server = http.createServer(app)

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// connection mysql
const dbConnection = require('./connection/db')

const uploadFile = require('./middleware/uploadFile')

// handle hbs view
app.set('view engine', 'hbs')

// Allow access publi css
app.use('/public', express.static(path.join(__dirname, 'public')))

// create session

app.use(
    session({
        cookie: {
            maxAge: 1000 * 60 * 60 * 60 * 1,
        },
        store: new session.MemoryStore(),
        resave: false,
        saveUninitialized: true,
        secret: 'Secret',
    })
)

app.use(function (req, res, next) {
    res.locals.message = req.session.message
    delete req.session.message;
    next();
})


hbs.registerPartials(__dirname + '/views/partials')

const isLogin = false;
const status = 0;
const isAdmin = false;

app.get('/', function (req, res) {
    const title = 'Home'
    res.render('index', {
        title,
        isLogin: req.session.isLogin,
        isAdmin: req.session.isAdmin
    })
})

app.get('/login', function (req, res) {
    const title = 'Login'
    res.render('login', {
        title,
        isLogin,
    })
})

app.post('/login', function (req, res) {
    const { email, password } = req.body
    if (email == '' || password == '') {
        req.session.message = {
            type: 'danger',
            message: 'Please insert all field!'
        }

        return res.redirect('/login')
    }

    const query = `SELECT *, MD5(password) as password, CAST(status as UNSIGNED) as status FROM tb_user WHERE email = "${email}" AND password = "${password}"`

    dbConnection.connect(function (err, conn) {
        if (err) throw err
        conn.query(query, function (err, results) {
            if (err) throw err

            if (results.length == 0) {
                req.session.message = {
                    type: 'danger',
                    message: 'Email or Password wrong!'
                }
                res.redirect('/login')
            } else {
                req.session.message = {
                    type: 'success',
                    message: 'Login Successfully'
                }

                if (results[0].status == 1) {
                    req.session.isAdmin = true
                } else {
                    req.session.isAdmin = false
                }

                req.session.isLogin = true

                req.session.user = {
                    id: results[0].id,
                    email: results[0].email,
                    name: results[0].name,
                    status: results[0].status
                }
            }
            res.redirect('/')
            console.log(results)
        })
    })
})

// Sign up new user
app.get('/register', function (req, res) {
    const title = 'Register'
    res.render('register', {
        title,
        isLogin
    })
})

app.post('/register', function (req, res) {
    const { email, password, no_ktp, name, address, phone } = req.body;

    if (email == '' || password == '' || no_ktp == '' || name == '' || address == '' || phone == '') {
        req.session.message = {
            type: 'danger',
            message: 'Please insert all field!',
        }

        return res.redirect('/register')
    }
    const query = `INSERT INTO tb_user (email, password, no_ktp, name, address,phone, status) VALUES("${email}","${password}",${no_ktp},"${name}","${address}","${phone}",${status})`

    dbConnection.connect(function (err, conn) {
        if (err) throw err
        conn.query(query, function (err, results) {
            if (err) throw err
            req.session.message = {
                type: 'success',
                message: 'Register Successfully',
            }
            res.redirect('/register')
        })
    })
})

app.get('/register-car', function (req, res) {
    const title = 'Register New Car'
    const queryType = `SELECT * FROM tb_type`
    let carType = []

    const queryBrand = `SELECT * FROM tb_brand`
    let carBrand = []

    dbConnection.connect(function (err, conn) {
        if (err) throw err
        conn.query(queryType, function (err, results) {
            if (err) throw err
            for (var result of results) {
                carType.push({
                    id: result.id,
                    name: result.name
                })
            }
        })
    })

    dbConnection.connect(function (err, conn) {
        if (err) throw err
        conn.query(queryBrand, function (err, results) {
            if (err) throw err
            for (var result of results) {
                carBrand.push({
                    id: result.id,
                    name: result.name
                })
            }
        })
    })
    res.render('addNewCar', {
        title,
        isLogin: req.session.isLogin,
        carType,
        carBrand
    })
})

app.post('/register-car', uploadFile('photo'), function (req, res) {
    const { name, plat_number, price, type_id, brand_id, photo } = req.body
    if (name == '' || plat_number == '' || price == '' || type_id == '' || brand_id == '' || photo == '') {
        req.session.message = {
            type: 'danger',
            message: 'Please insert all field'
        }

        return res.redirect('/register-car')
    }

    const query = `INSERT INTO tb_car (name, plat_number, price, photo, status, brand_id, type_id) VALUES ("${name}","${plat_number}",${price},"${photo}",${status}, ${brand_id}, ${type_id})`
    dbConnection.connect(function (err, conn) {
        if (err) throw err
        conn.query(query, function (err, results) {
            if (err) throw err
            req.session.message = {
                type: 'success',
                message: 'Create car data successfully'
            }
            res.redirect('/register-car')
            // console.log(results)
        })
    })
})

app.get('/transaction', function (req, res) {
    const title = 'Transaction'
    res.render('transaction', {
        title
    })
})

app.get('/transaction-success', function (req, res) {
    const title = 'Transaction Success'
    res.render('transactionSuccess', {
        title,
        isLogin
    })
})

app.get('/logout', function (request, response) {
    request.session.destroy();
    response.redirect('/');
});


server.listen(port)
console.debug(`Server running http://localhost:${port}`)

