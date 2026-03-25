const express = require('express');
const { engine } = require('express-handlebars');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const port = 3000;

// 1. CONFIGURAR HANDLEBARS
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: false, // Volvemos a false porque usas partials (header, menu, footer)
    partialsDir: path.join(__dirname, 'views/partials') 
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// 2. CONTENIDOS ESTÁTICOS Y CACHE
// ¡CORRECCIÓN CLAVE!: Ponemos '../public' para que salga de la carpeta 'server' y encuentre el CSS
app.use(express.static(path.join(__dirname, '../public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});
app.use(express.urlencoded({ extended: true }));

// 3. CONEXIÓN MYSQL (Pool de conexiones)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'super',
    password: '1234',
    database: 'sakila',
    waitForConnections: true,
    connectionLimit: 10
});

// --- RUTES ---

// A) RUTA PRINCIPAL (Home - index.hbs)
app.get('/', async (req, res) => {
    try {
        const [movies] = await pool.query('SELECT title, release_year FROM film LIMIT 5');
        const [categories] = await pool.query('SELECT name FROM category LIMIT 5');
        
        res.render('index', { 
            titolPagina: 'Benvinguts a Sakila', 
            titolGlobal: 'Sakila Movies',
            any: new Date().getFullYear(),
            movies: movies, 
            categories: categories 
        });
    } catch (error) {
        console.error("Error en la home:", error);
        res.render('index', { titolPagina: 'Inici', movies: [], categories: [] });
    }
});

// B) RUTA CLIENTS (customers.hbs)
app.get('/customers', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT first_name, last_name, email FROM customer LIMIT 25');
        
        res.render('customers', { 
            titolPagina: 'Llistat de Clients', 
            titolGlobal: 'Sakila Movies',
            any: new Date().getFullYear(),
            customers: rows 
        }); 
    } catch (error) {
        console.error("Error en clientes:", error);
        res.status(500).send("Error al carregar els clients");
    }
});

// C) RUTA PEL·LÍCULES (movies.hbs)
app.get('/movies', async (req, res) => {
    try {
        const [movies] = await pool.query(`
    SELECT f.film_id, f.title, f.description, f.release_year, f.rating, 
           GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') as actors 
    FROM film f 
    LEFT JOIN film_actor fa ON f.film_id = fa.film_id 
    LEFT JOIN actor a ON fa.actor_id = a.actor_id 
    GROUP BY f.film_id 
    ORDER BY f.film_id DESC 
    LIMIT 15`);
        res.render('movies', { 
            titolPagina: 'Llistat de Pel·lícules', 
            titolGlobal: 'Sakila Movies',
            any: new Date().getFullYear(),
            movies: movies 
        });
    } catch (err) {
        res.status(500).send("Error a la ruta /movies: " + err.message);
    }
});

// ==========================================
// EXERCICI 303: CRUD PELÍCULAS
// ==========================================

// 1. Veure detalls d'una pel·lícula
app.get('/movie/:id', async (req, res) => {
    try {
        const [movie] = await pool.query('SELECT * FROM film WHERE film_id = ?', [req.params.id]);
        if (movie.length === 0) return res.status(404).send('Pel·lícula no trobada');
        
        res.render('movie', { titolPagina: movie[0].title, movie: movie[0] });
    } catch (err) { res.status(500).send(err.message); }
});

// 2. Formulari per afegir pel·lícula
app.get('/movieAdd', async (req, res) => {
    try {
        const [languages] = await pool.query('SELECT language_id, name FROM language');
        res.render('movieAdd', { titolPagina: 'Afegir Nova Pel·lícula', languages });
    } catch (err) { res.status(500).send(err.message); }
});

// 3. POST: Guardar la nova pel·lícula
app.post('/afegirPeli', async (req, res) => {
    const { title, description, release_year, language_id } = req.body;
    try {
        // Sakila exigeix un language_id per defecte.
        await pool.query(
            'INSERT INTO film (title, description, release_year, language_id) VALUES (?, ?, ?, ?)',
            [title, description, release_year, language_id]
        );
        res.redirect('/movies'); // Tornem a la llista
    } catch (err) { res.status(500).send(err.message); }
});

// 4. Formulari per editar pel·lícula
app.get('/movieEdit/:id', async (req, res) => {
    try {
        const [movie] = await pool.query('SELECT * FROM film WHERE film_id = ?', [req.params.id]);
        const [languages] = await pool.query('SELECT language_id, name FROM language');
        
        res.render('movieEdit', { titolPagina: 'Editar: ' + movie[0].title, movie: movie[0], languages });
    } catch (err) { res.status(500).send(err.message); }
});

// 5. POST: Guardar els canvis de l'edició
app.post('/editarPeli', async (req, res) => {
    const { film_id, title, description, release_year, language_id } = req.body;
    try {
        await pool.query(
            'UPDATE film SET title = ?, description = ?, release_year = ?, language_id = ? WHERE film_id = ?',
            [title, description, release_year, language_id, film_id]
        );
        res.redirect('/movie/' + film_id); // Tornem a veure la peli
    } catch (err) { res.status(500).send(err.message); }
});

// 6. POST: Esborrar pel·lícula
app.post('/esborrarPeli', async (req, res) => {
    const { film_id } = req.body;
    try {
        await pool.query('DELETE FROM film WHERE film_id = ?', [film_id]);
        res.redirect('/movies');
    } catch (err) { 
        res.status(500).send("Error esborrant (pot tenir relacions d'actors): " + err.message); 
    }
});

app.listen(3000, () => console.log('🚀 Servidor funcionant a http://localhost:3000'));