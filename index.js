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

const reviewUrl = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

app.use(function( err, req, res, next ){
  res.status(404).json({error: err});
})


// ROUTE HANDLER
function getFilmRecommendations( req, res ) {

  console.log(req.originalUrl)
  const filmId = req.params.id;


  const limit = parseInt( req.query.limit || 10, 10 );
  const offset = parseInt( req.query.offset || 0, 10 );

  // console.log("limit: " + limit);
  // console.log("offset: " + offset);

  if( isNaN( filmId ) ){
    res.status( 422 ).json( {messages:'this is my sending error'} )
  }

  let films = null;
  const tracker = {};

  conn.sync()
    .then(() => Film.findById(filmId,{include: [{model: Genre }] }) )
    .then(function(result){

      if(!result) {
        return Promise.reject( new Error('"message" key missing') )
      };

      var qenreId = result.dataValues.genre.dataValues.id;

      var startDate = new Date(result.dataValues.releaseDate);
      var endDate = new Date(result.dataValues.releaseDate);

      var currentdate = startDate.getFullYear();

      startDate.setFullYear( currentdate - 15 );
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
        include:[{
          model: Genre,
          attributes: ["name"]
        }],
        // limit did not work
        // why:
        // limit: limit,
        offset: offset,
        raw: true
      });
    })
    .then(function( results ){
      let ids = "";

      films = results;

      results.forEach(function( { id, title, releaseDate }, index ){
        // Store ids of films
        ids += `${id}${index === films.length - 1 ? "":","}`;
        tracker[id] = index;
      });

      // send data to api
     return new Promise(function( resolve, reject ){
        // request.get({ url: reviewUrl, qs:{ films: ids.join(",")}, json: true})
        //   .on("error", reject)
        //   .on("response", resolve);
        request.get({ url: reviewUrl, qs:{ films: ids}, json: true}, function( err, response, body ){
          if(err) return reject(err);
          resolve(response);
        });
     })

    })
    .then(function( response ){
      // console.log(response.body.length)

      let finalResults = [];
      // console.log(films.length)
      // console.log("query length: " + response.body.length)

      var reviews = response.body.filter(function({ film_id, reviews }){
        // console.log("This film has " + reviews.length + "reviews");
        // console.log("This film has average score is  " + reviews.reduce((acc, num) => acc + num.rating, 0) / reviews.length);
        // return reviews.length >= 5 && (reviews.reduce((acc, num) => acc + num.rating, 0) / reviews.length) > 4;
        const overallScore = reviews.reduce(( acc, num ) =>  acc + num.rating , 0);
        const average =  overallScore / reviews.length;

//         console.log(`\
// film_id: ${film_id}
// average: ${average}
// did pass: ${reviews.length >= 5 && average >= 4}
// `)

        if(reviews.length >= 5 && average >= 4){
          let filmIndex = tracker[ film_id ];
          let film = films[ filmIndex ];

          finalResults.push({
            id: film.id,
            title: film.title,
            releaseDate: film.releaseDate,
            reviews: reviews.length,
            genre: film["genre.name"],
            averageRating: Number(average.toFixed(2))
          });

        }

      });
      // console.log("final results length: " + finalResults.length)
      res.json({ recommendations: finalResults.slice(offset, offset + limit), meta: { limit, offset } })

      // console.log(reviews.length);

    })
    .error(function(err){
      res.status(500).json({error: err})
    })
}

module.exports = app;
