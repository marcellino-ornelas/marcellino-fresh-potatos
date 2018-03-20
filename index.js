const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// var db = sqlite.open("db/database.db", { promise: Promise});

var conn = new Sequelize("null", "null", "null",{
  host: 'localhost',
  dialect: 'sqlite',
  storage: 'db/database.db'
});

const Film = conn.define("Films",{
  title: Sequelize.STRING,
  releaseDate:{
    type: Sequelize.STRING,
    field:"release_date"
  },
  tagline: Sequelize.STRING,
  revenue :Sequelize.INTEGER,
  budget:Sequelize.INTEGER,
  runtime:Sequelize.INTEGER,
  originalLanguage: {
    type: Sequelize.STRING,
    field: "original_language"
  },
  status: Sequelize.STRING,
  genreId:{
    type: Sequelize.INTEGER,
    field: "genre_id"
  }
},{
  timestamps: false,
});

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  var filmId = req.params.id;
  // request.get('http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1', function(err, response,body){
  //   if(err){
  //     res.status(500).send("error")
  //   }
  //   var data = JSON.parse(body)

  //   console.log(data)
  //   res.json({ recommendations: data })

  // });
  conn.sync().then(function(){

    Film.findById(filmId).then(function(article){
      console.log(article)
    });

  }).error(console.log);

}

module.exports = app;
