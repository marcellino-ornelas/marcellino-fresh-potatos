const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      // stream = require('stream'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// const form = new stream.Transform({
//   transform(chunk, encoding, callback) {
//     console.log(chunk.toString())
//     // console.log(encoding.toString())
//     this.push( JSON.stringify({ recommendations: chunk.toString() }));
//     callback();
//   }
// });

// process.stdin.pipe(upperCaseTr).pipe(process.stdout);



// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  // request('http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1').pipe(form).pipe(res)

  request.get('http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1', function(err, response,body){
    if(err){
      res.status(500).send("error")
    }
    var data = JSON.parse(body)

    console.log(data)
    res.json({ recommendations: data })

  });
}

module.exports = app;
console.log("server running")
