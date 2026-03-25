const express = require('express');
const hbs = require('hbs');
const path = require('path');

// Com que db.js i app.js estan a la mateixa carpeta 'server', fem servir './db'
const db = require('./db'); 

// La ruta cap a common.json dins de la carpeta 'server/data'
const commonData = require('./data/common.json');

const app = express();

app.set('view engine', 'hbs');

// Configuració de carpetes (app.js ja està dins de 'server')
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// La carpeta 'public' està fora de 'server', pugem un nivell amb '../'
app.use(express.static(path.join(__dirname, '../public')));

// --- RUTES ---

// B) Pàgina Principal -> index.hbs
app.get('/', async (req, res) => {
    try {
        const [movies] = await db.query(`
            SELECT f.title, f.release_year, GROUP_CONCAT(a.first_name SEPARATOR ', ') as actors 
            FROM film f 
            JOIN film_actor fa ON f.film_id = fa.film_id 
            JOIN actor a ON fa.actor_id = a.actor_id 
            GROUP BY f.film_id LIMIT 5`);
        const [categories] = await db.query('SELECT name FROM category LIMIT 5');
        res.render('index', { ...commonData, movies, categories });
    } catch (err) { 
        res.status(500).send("Error a la Home: " + err.message); 
    }
});

// C) RUTA ACTUALITZADA: Pàgina Pel·lícules -> movies.hbs
// Mostra les 15 primeres pel·lícules amb la seva info i llista d'actors
app.get('/movies', async (req, res) => {
    try {
        const [movies] = await db.query(`
            SELECT f.title, f.description, f.release_year, f.rating, 
                   GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') as actors 
            FROM film f 
            LEFT JOIN film_actor fa ON f.film_id = fa.film_id 
            LEFT JOIN actor a ON fa.actor_id = a.actor_id 
            GROUP BY f.film_id 
            LIMIT 15`);
            
        // Canviem 'informe' per 'movies' segons l'enunciat
        res.render('movies', { ...commonData, movies });
    } catch (err) { 
        res.status(500).send("Error a la ruta /movies: " + err.message); 
    }
});

// D) Ruta Customers -> customers.hbs
app.get('/customers', async (req, res) => {
    try {
        const [customers] = await db.query('SELECT customer_id, first_name, last_name FROM customer LIMIT 25');
        
        for (let c of customers) {
            const [rentals] = await db.query(
                'SELECT rental_date FROM rental WHERE customer_id = ? LIMIT 5', 
                [c.customer_id]
            );
            c.rentals = rentals;
        }
        
        res.render('customers', { ...commonData, customers });
    } catch (err) { 
        res.status(500).send("Error a Customers: " + err.message); 
    }
});

app.listen(3000, () => console.log('🚀 Servidor funcionant a http://localhost:3000'));