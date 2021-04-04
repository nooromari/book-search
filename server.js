'use strict';

require('dotenv').config();

const express = require('express');
const superagent = require('superagent');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public/styles'));
app.use(errorHandler);

app.set('view engine', 'ejs');


app.get('/', renderHomePage);
app.get('/searches/new', showForm);
app.post('/searches', createSearch);

app.get('*', (request, response) => response.status(404).send('This route does not exist'));

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  res.status(500);
  res.render('pages/error', { error: err });
}

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

function renderHomePage(request, response) {
  response.render('pages/index');
}

function showForm(request, response) {
  response.render('pages/searches/new');
}

function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  console.log(request.body);
  console.log(request.body.search);

  // can we convert this to ternary?
  if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }

  superagent.get(url)
    .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
    .then(results => response.render('pages/searches/show', { searchResults: results }))
    .catch(error => response.status(500).send(`somthing wrong ${error}`));
  // const search = request.body.search[0];
  // let url = `https://www.googleapis.com/books/v1/volumes?q=${search}`;
  // let url = `https://www.googleapis.com/books/v1/volumes?q=flowers+inauthor:`;

  // console.log(url);
  // console.log(request.body.search);
  // superagent.get(url).then(data=> response.send(data.body.items));

  // can we convert this to ternary?
  // if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  // if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }

  // superagent.get(url)
  //   .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
  //   .then(results => response.render('pages/searches/show', { searchResults: results }));
  // how will we handle errors?
  // response.render('pages/searches/show');

}

function Book(info) {
  // this.image = info.imageLinks.smallThumbnail ||'https://i.imgur.com/J5LVHEL.jpg';
  this.title = info.title || 'No title available'; // shortcircuit
  this.author = info.authors[0];
  this.description = info.description;
  this.image = (info.imageLinks) ? info.imageLinks.smallThumbnail : 'https://i.imgur.com/J5LVHEL.jpg';
}
