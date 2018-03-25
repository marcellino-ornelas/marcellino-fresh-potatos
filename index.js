const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

/*
 * Modules
*/
const qs = require('querystring');

/*
 * Env
*/
const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

/*
 * Initialize Sequelize
*/
var conn = new Sequelize('null', 'null', 'null',{
  host: 'localhost',
  dialect: 'sqlite',
  storage: 'db/database.db'
});

/*
 * Film Model
*/
const Genre = conn.define('genre',{
  name: Sequelize.STRING
},{
  timestamps: false
});


const Film = conn.define('film',{
  title: Sequelize.STRING,
  releaseDate:{
    type: Sequelize.STRING,
    field:'release_date'
  },
  tagline: Sequelize.STRING,
  revenue :Sequelize.INTEGER,
  budget:Sequelize.INTEGER,
  runtime:Sequelize.INTEGER,
  originalLanguage: {
    type: Sequelize.STRING,
    field: 'original_language'
  },
  status: Sequelize.STRING,
  genreId:{
    type: Sequelize.INTEGER,
    field: "genre_id",
    references: {
      model: Genre,
      key: "id"
    }
  }
},{
  timestamps: false
});

Film.belongsTo(Genre);

/*
 * Variables
*/

const ERROR_MESSAGE = {message:'"message" key missing'};
const reviewUrl = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

app.get("*", function( req, res ){
  /*
   * All other routes
  */
   res.status( 404 ).json( ERROR_MESSAGE );
});


// ROUTE HANDLER
function getFilmRecommendations( req, res ) {

  const filmId = req.params.id;
  const limit = parseInt( req.query.limit || 10, 10 );
  const offset = parseInt( req.query.offset || 0, 10 );

  if( isNaN( filmId ) || isNaN(limit) || isNaN(offset) ){
    /*
     * Send 422 status when limit, offset, or filmId is not a number
    */
    res.status( 422 ).json( ERROR_MESSAGE );
  }

  // keep track of films indexes
  const tracker = {};
  let films = null;


  conn.sync()
    .then(() => Film.findById( filmId, { include: [{model: Genre}] } ) )
    .then(function(result){

      if(!result) {
        return Promise.reject( true )
      };

      let mainFilm = result.dataValues;

      var qenreId = mainFilm.genre.dataValues.id;

      // Make date objects for start and end date times
      var startDate = new Date( mainFilm.releaseDate );
      var endDate = new Date( mainFilm.releaseDate );

      var currentdate = startDate.getFullYear();

      // set date to 15 years back
      startDate.setFullYear( currentdate - 15 );

      // set date to 15 years forward
      endDate.setFullYear( currentdate + 15 );

      return Film.findAll({
        where:{
          genreId: qenreId,
          releaseDate:{
            "$lte": endDate,
            "$gte": startDate
          }
        },
        attributes:["id","title","releaseDate"],
        order:[['id', 'ASC']],
        include: [{model: Genre, attributes: ["name"] }],
        raw: true
      });
    })
    .then(function( results ){
      let ids = "";

      films = results;

      films.forEach(function( { id }, index ){
        // Store ids of films to send to 3rd party api
        ids += `${id}${index === films.length - 1 ? '' : ','}`;
        // keep track of index of films
        tracker[id] = index;
      });

      // send data to api
     return new Promise(function( resolve, reject ){
        request.get({ url: reviewUrl, qs:{ films: ids}, json: true}, function( err, response, body ){
          if(err) return reject(err);
          resolve(response);
        });
     })

    })
    .then(function( response ){

      let finalResults = [];

      var reviews = response.body.filter(function({ film_id, reviews }){

        const overallScore = reviews.reduce(( acc, num ) =>  acc + num.rating , 0);
        const average =  Number( (overallScore / reviews.length).toFixed(2) );

        if(reviews.length >= 5 && average >= 4){
          // Get index of film with help from tracker.
          // The reason for this is to prevent a nested loop to search for film.
          let filmIndex = tracker[ film_id ];
          let film = films[ filmIndex ];

          finalResults.push({
            id: film.id,
            title: film.title,
            releaseDate: film.releaseDate,
            reviews: reviews.length,
            genre: film['genre.name'],
            averageRating: average
          });

        }

      });

      res.json({ recommendations: finalResults.slice(offset, offset + limit), meta: { limit, offset } });
    })
    .error(function(err){
      res.status(500).json(ERROR_MESSAGE);
    })
}

module.exports = app;
