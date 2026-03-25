const express = require('express');
const hbs = require('hbs');
const path = require('path');

// Importem la base de dades com a 'db'
const db = require('./db'); 
const commonData = require('./data/common.json');

const app = express();

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// --- MIDDLEWARE CRÍTIC ---
// Sense això, els 'req.body' dels teus POST arribaran buits
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// --- RUTES EXISTENTS ---

app.get('/', async (req, res) => {
    try {
        const [movies] = await db.query(`
            SELECT f.film_id, f.title, f.release_year, GROUP_CONCAT(a.first_name SEPARATOR ', ') as actors 
            FROM film f 
            LEFT JOIN film_actor fa ON f.film_id = fa.film_id 
            LEFT JOIN actor a ON fa.actor_id = a.actor_id 
            GROUP BY f.film_id LIMIT 5`);
        const [categories] = await db.query('SELECT name FROM category LIMIT 5');
        res.render('index', { ...commonData, movies, categories });
    } catch (err) { res.status(500).send("Error a la Home: " + err.message); }
});

app.get('/movies', async (req, res) => {
    try {
        const [movies] = await db.query(`
            SELECT f.film_id, f.title, f.description, f.release_year, f.rating, 
                   GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') as actors 
            FROM film f 
            LEFT JOIN film_actor fa ON f.film_id = fa.film_id 
            LEFT JOIN actor a ON fa.actor_id = a.actor_id 
            GROUP BY f.film_id 
            ORDER BY f.film_id DESC LIMIT 15`);
        res.render('movies', { ...commonData, movies });
    } catch (err) { res.status(500).send("Error a /movies: " + err.message); }
});

// --- EXERCICI 303: CRUD PELÍCULAS (CORREGIT) ---

// 1. Veure detalls
app.get('/movie/:id', async (req, res) => {
    try {
        // Canviat pool per db
        const [movie] = await db.query('SELECT * FROM film WHERE film_id = ?', [req.params.id]);
        if (movie.length === 0) return res.status(404).send('Pel·lícula no trobada');
        res.render('movie', { ...commonData, movie: movie[0] });
    } catch (err) { res.status(500).send(err.message); }
});

// 2. Formulari per afegir
app.get('/movieAdd', async (req, res) => {
    try {
        const [languages] = await db.query('SELECT language_id, name FROM language');
        res.render('movieAdd', { ...commonData, languages });
    } catch (err) { res.status(500).send(err.message); }
});

// 3. POST: Afegir
app.post('/afegirPeli', async (req, res) => {
    const { title, description, release_year, language_id } = req.body;
    try {
        await db.query(
            'INSERT INTO film (title, description, release_year, language_id) VALUES (?, ?, ?, ?)',
            [title, description, release_year, language_id]
        );
        res.redirect('/movies');
    } catch (err) { res.status(500).send("Error afegint: " + err.message); }
});

// 4. Formulari per editar
app.get('/movieEdit/:id', async (req, res) => {
    try {
        const [movie] = await db.query('SELECT * FROM film WHERE film_id = ?', [req.params.id]);
        const [languages] = await db.query('SELECT language_id, name FROM language');
        res.render('movieEdit', { ...commonData, movie: movie[0], languages });
    } catch (err) { res.status(500).send(err.message); }
});

// 5. POST: Editar
app.post('/editarPeli', async (req, res) => {
    const { film_id, title, description, release_year, language_id } = req.body;
    try {
        await db.query(
            'UPDATE film SET title = ?, description = ?, release_year = ?, language_id = ? WHERE film_id = ?',
            [title, description, release_year, language_id, film_id]
        );
        res.redirect('/movie/' + film_id);
    } catch (err) { res.status(500).send("Error editant: " + err.message); }
});

// 6. POST: Esborrar
app.post('/esborrarPeli', async (req, res) => {
    const { film_id } = req.body;
    try {
        await db.query('DELETE FROM film WHERE film_id = ?', [film_id]);
        res.redirect('/movies');
    } catch (err) { 
        res.status(500).send("Error esborrant (possiblement per claus foranes): " + err.message); 
    }
});

// Ruta Customers (mantenida igual)
app.get('/customers', async (req, res) => {
    try {
        const [customers] = await db.query('SELECT customer_id, first_name, last_name FROM customer LIMIT 25');
        for (let c of customers) {
            const [rentals] = await db.query('SELECT rental_date FROM rental WHERE customer_id = ? LIMIT 5', [c.customer_id]);
            c.rentals = rentals;
        }
        res.render('customers', { ...commonData, customers });
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(3000, () => console.log('🚀 Servidor funcionant a http://localhost:3000'));