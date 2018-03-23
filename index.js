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

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  const filmId = req.params.id;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;

  // console.log("limit: " + limit);
  // console.log("offset: " + offset);

  let finalResults = null;

  conn.sync()
    .then(() => Film.findById(filmId,{include: [{model: Genre }] }) )
    .then(function(result){

      var qenreId = result.dataValues.genre.dataValues.id

      var startDate = new Date(result.dataValues.releaseDate);
      var endDate = new Date(result.dataValues.releaseDate);

      var currentdate = startDate.getFullYear();

      startDate.setFullYear( currentdate - 15 );
      endDate.setFullYear( currentdate + 15 );


      return Film.findAll({
        where:{
          genreId: qenreId,
          releaseDate:{
            between: [startDate, endDate]
          }
        },
        include:[{
          model: Genre,
          attributes: ["name"]
        }],
        limit: limit,
        offset: offset
      });
    })
    .then(function(results){
      let ids = [];

      finalResults = results.map(function(item){
        // Store ids of films
        let holder = item.dataValues;
        ids.push(holder.id);
        holder.genre = holder.genre.dataValues.name;

        return holder;
      });

      console.log("ids: ", ids);
      console.log(finalResults);

      // send data to api
     return new Promise(function(resolve, reject){
        request.get({ url: reviewUrl, qs:{ films: ids.join(",") }})
          .on("error", reject)
          .on("response", resolve);
     })

    })
    .then(function(response){
      console.log(response)
    })
    .error(function(err){
      res.status(500).json({messages:'error'})
    })
}

module.exports = app;
