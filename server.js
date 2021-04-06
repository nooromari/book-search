'use strict';

require('dotenv').config();

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;
const DATABASE_URL= process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV;
const options = NODE_ENV === 'production' ? { connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } } : { connectionString: DATABASE_URL };
const client = new pg.Client(options);

client.on('error', err => {
  console.log('unable to connect database');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// app.use(errorHandler);

app.set('view engine', 'ejs');


app.get('/', renderHomePage);
app.get('/searches/new', showForm);
app.post('/searches', createSearch);
app.get('/books/:id', getOneBook);
app.post('/books', addBook);

app.use('*', (request, response) => response.status(404).send('This route does not exist'));

client.connect().then(() => app.listen(PORT, () => console.log(`Listening on port: ${PORT}`)));

function errorHandler(err, res) {
  res.status(500).render('pages/error', { error: 'somthing wrong' });
}


function renderHomePage(request, response) {
  let SQL = 'SELECT * FROM books;';

  return client.query(SQL)
    .then(results =>{
      return response.render('pages/index', { results: results.rows , count: results.rowCount});
    })
    .catch((error) => errorHandler(error, response));
  // response.render('pages/index');
}

function showForm(request, response) {
  response.render('pages/searches/new');
}

function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  console.log(request.body);
  console.log(request.body.search);

  // can we convert this to ternary?
  // if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  // if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }
  (request.body.search[1] === 'title')? url += `+intitle:${request.body.search[0]}` : url += `+inauthor:${request.body.search[0]}`;

  superagent.get(url)
    .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
    .then(results => response.render('pages/searches/show', { searchResults: results }))
    .catch(err => errorHandler(err, response));
}

function Book(info) {
  this.title = info.title || 'No title available'; // shortcircuit
  this.author = (info.authors)? info.authors.join(', ') : 'No author available';
  this.descriptions = info.description || 'No description available';
  this.image_url = (info.imageLinks) ? info.imageLinks.smallThumbnail : 'https://i.imgur.com/J5LVHEL.jpg';
  this.isbn = (info.industryIdentifiers && info.industryIdentifiers[0].identifier) ? info.industryIdentifiers[0].identifier : 'No ISBN available' ;
}

function getOneBook(req,res){
  let SQL = 'SELECT * FROM books WHERE id=$1;';
  console.log(req.params);
  let values = [req.params.id];

  return client.query(SQL, values)
    .then(result => {
      console.log('single', result.rows[0]);
      return res.render('pages/books/show', { book: result.rows[0] });
    })
    .catch(err => errorHandler(err, res));
}

function addBook(req,res){
  console.log(req.body);
  const data = req.body;
  const sql = 'INSERT INTO books (author,title,isbn,image_url,descriptions) VALUES ($1,$2,$3,$4,$5) RETURNING id;';
  const values = [data.author, data.title,data.isbn,data.image_url,data.descriptions];
  client.query(sql,values)
    .then(result =>{
      res.redirect(`/books/${result.rows[0].id}`);
    }).catch(err => errorHandler(err, res));
}
