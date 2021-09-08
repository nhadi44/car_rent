const express = require('express')
const http = require('http')
const path = require('path')
const hbs = require('hbs')
const session = require('express-session')
const multer = require('multer')
const bodyParser = require('body-parser')

const app = express()
const port = 8000
const server = http.createServer(app)

var pathFile = `uploads/`;

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// connection mysql
const dbConnection = require('./connection/db')

const uploadFile = require('./middleware/uploadFile')

// handle hbs view
app.set('view engine', 'hbs')

// Allow access publi css
app.use('/public', express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, ''));
        // console.log(file)
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

const upload = multer({ storage: storage, fileFilter: fileFilter });


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

    const query = `SELECT * FROM tb_car ORDER BY id DESC`

    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, results) => {
            if (err) throw err

            let car = []

            for (var result of results) {
                car.push({
                    id: result.id,
                    name: result.name,
                    price: result.price,
                    image: pathFile + result.photo
                })
            }

            if (car.length == 0) {
                car = false
            }
            console.log(car)
            res.render('index', {
                title,
                isLogin: req.session.isLogin,
                isAdmin: req.session.isAdmin,
                car
            })
        })
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
    console.log(carBrand.length)
    res.render('addNewCar', {
        title,
        isLogin: req.session.isLogin,
        carType,
        carBrand
    })
})

app.post('/register-car', uploadFile('photo'), function (req, res) {
    const { name, plat_number, price, type_id, brand_id } = req.body
    var photo = '';

    if (req.file) {
        photo = req.file.filename;
    }

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
            console.log(results)
        })
    })
})

app.post('/transaction', function (req, res) {
    const { borrow_date, return_date, sub_total, id } = req.body
    const user = req.session.user.id

    const query = `INSERT INTO tb_rent (borrow_date, return_date, sub_total, user_id, car_id) VALUES ("${borrow_date}", "${return_date}",${sub_total}, ${user} , ${id})`
    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, results) => {
            if (err) throw err
            if (results.length == 0) {
                req.session.message = {
                    type: 'success',
                    message: 'Transaction Success!'
                }
            }
            res.redirect('/transaction-success')
        })
    })

    // console.log(price)

})

app.get('/transaction-success', function (req, res) {
    const title = 'Transaction Success'
    res.render('transactionSuccess', {
        title,
        isLogin: req.session.isLogin,
    })
})

app.get('/dashboard', (req, res) => {
    // user = req.session.user.name
    const title = `Dashboard`//${user}`
    const greeting = `List Car`
    // const number = 1;

    const query = `SELECT tb_car.id,tb_car.name,tb_car.plat_number,tb_car.price, tb_brand.name as brand, tb_type.name as type
    ,case when cast(tb_car.status as unsigned) = 0 then 'available' else 'not avaliable' end as status FROM tb_car 
    inner join tb_brand on tb_brand.id = tb_car.id
    inner join tb_type on tb_type.id = tb_car.id`

    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, results) => {
            if (err) throw err
            console.log(results)
            res.render('admin', {
                title,
                greeting,
                isLogin: req.session.isLogin,
                results,
                // number
            })
        })
    })

})

// Edit list car
app.get('/edit-car/:id', (req, res) => {
    const title = 'Edit List Car'
    const { id } = req.params

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
    const query = `SELECT * FROM tb_car WHERE id = ${id}`
    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, results) => {
            if (err) throw err
            const data = {
                ...results[0],
                image: pathFile + results[0].photo
            }


            res.render('editCar', {
                title,
                isLogin: req.session.isLogin,
                data,
                carType,
                carBrand,
            })
        })
    })

})

app.post('/edit-car', uploadFile('photo'), (req, res) => {
    var { id, name, plat_number, price, photo, status, brand_id, type_id } = req.body
    // var photo = photo.replace(pathFile, '')
    // console.log(id)
    if (req.file) {
        photo = req.file.filename
    }
    const query = `UPDATE tb_car SET name = "${name}", plat_number = "${plat_number}", price = ${price}, photo = "${photo}",status = ${status},brand_id = ${brand_id}, type_id = ${type_id} WHERE id = ${id}`;


    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, results) => {
            if (err) throw err
            req.session.message = {
                type: 'success',
                message: 'Update  car data successfully'
            }
            res.redirect('/dashboard')
        })
    })
})

app.get('/delete-car/:id', (req, res) => {
    const { id } = req.params
    const query = `DELETE FROM tb_car WHERE id = ${id}`
    const resetIncrement = `ALTER TABLE tb_car AUTO_INCREMENT = 1`


    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, result) => {
            if (err) throw err
            req.session.message = {
                type: 'success',
                message: 'Delete car data successfully'
            }
            res.redirect('/dashboard')
        })
    })

    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(resetIncrement, (err, results) => {
            if (err) throw err
        })
    })
    console.log(id)
})

app.get('/car', (req, res) => {
    const title = 'Add new Car'
    res.send('car', {
        title,
        isLogin: req.session.isLogin
    })
})

app.get('/transaction/:id', (req, res) => {
    const { id } = req.params
    const title = 'Transaction'
    const query = 'SELECT * FROM tb_car'

    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, results) => {
            if (err) throw err
            res.render('transaction', {
                title,
                id,
                results
            })
        })
    })
})

app.get('/transaction-list', (req, res) => {
    const title = 'Transaction List'
    const query = `SELECT tb_rent.borrow_date, tb_rent.return_date, tb_rent.sub_total 
    ,tb_user.name, tb_car.name as carname, tb_car.plat_number, tb_type.name as type, 
    tb_brand.name as brand
    FROM tb_rent
    inner join tb_car on tb_car.id = tb_rent.car_id
    inner join tb_user on tb_user.id = tb_rent.user_id
    inner join tb_type on tb_type.id = tb_car.type_id
    inner join tb_brand on tb_brand.id = tb_car.brand_id`
    dbConnection.connect((err, conn) => {
        if (err) throw err
        conn.query(query, (err, results) => {
            if (err) throw err
            console.log(results)
            res.render('transactionList', {
                title,
                results,
                // isLogin: req.session.isLogin
            })
        })
    })
})

app.get('/logout', function (request, response) {
    request.session.destroy();
    response.redirect('/');
});


server.listen(port)
console.debug(`Server running http://localhost:${port}`)

