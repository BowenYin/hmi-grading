var oauth;
const functions=require("firebase-functions");
const admin=require("firebase-admin");
const axios=require("axios");
const https=require("https");
admin.initializeApp();
var firestore=admin.firestore();
var database=admin.database();
var answers={}; // cache answer lists
var config=functions.config(); // environment config variables
axios.defaults.baseUrl="https://api.mathpix.com/v3";
axios.defaults.httpsAgent=new https.Agent({keepAlive: true});
/**
 * Grades a given list of images represented as data URIs.
 * @param {string} id       ID to use for external API request
 * @param {string} password global password for all calls
 * @param {string} form     exact name of the answer sheet form that should be used
 * @param {Object[]} images list of images that should be graded
 * @param {string} images.field name of a single field to grade
 * @param {string} images.uri   data URI of the image
 * @returns {Object}
 */
exports.gradeForm=functions.https.onCall((data, context)=>{
  if (data.password!==config.hmi.password)
    throw new functions.https.HttpsError("permission-denied", "Incorrect password");
  return database.ref("keys/"+data.id).once("value").then(snapshot=>{
    var key=snapshot.val();
    if (!key.available)
      throw new functions.https.HttpsError("unavailable", "ID "+data.id+" is unavailable. Please refresh.");
    if (answers[data.form])
      return answers[data.form]; // answer sheet is cached
    return firestore.collection("answers").doc(data.form).get(); // get answer sheet
  }).then(form=>{
    if (!answers[data.form])
      answers[data.form]=form=form.data(); // cache answer form if not already
    let requests=[], results=[];
    let score=0;
    data.images.forEach(image=>{
      requests.push(axios.post("https://api.mathpix.com/v3/latex"));
      return axios.post("/latex", {src: image.uri}, {
        headers: {
          app_id: data.id,
          app_key: key.key
        }
      }).then(res=>{
        if (form[image.field].includes(res.latex_normal)) {
          results.push({
            field: image.field,
            correct: true,
            ocr: image.latex_normal
          });
          score++;
        } else {
          results.push({
            field: image.field,
            correct: false,
            ocr: image.latex_normal,
            answer: form[image.field]
          });
        }
      }).catch(err=>{
        throw new functions.https.HttpsError("internal", "API error has occurred");
      });
    });
    return axios.all(requests).then(responses=>{
      responses.forEach(res=>{
        
      });
      return {
        score,
        results
      };
    });
  }).catch(error=>{
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("unknown", error);
  });
});
/**
 * This function is NOT for hmi-grading, but I included it so I can share resources with this project.
 * Gets weather data for a specified city and date and stores historical data in the database.
 * This is for the Harker Boys Golf Schedule spreadsheet, for providing live weather info on any day.
 * Powered by Yahoo Weather Developer API
 * @param {string} date     date in YYYY/MM/DD format with padded month/day
 * @param {string} location city name and state code like "San Jose, CA"
 * @returns {string}        basic info string with weather condition and temperature
 */
exports.getWeather=functions.https.onRequest((req, res)=>{
  console.log({date: req.query.date, location: req.query.location, agent: req.get("User-Agent")});
  if (!/^[A-Z]\w+( [A-Z]\w+)*, [A-Z][A-Z]$/.test(req.query.location)) // City, ST
    return res.send("Invalid location format");
  if (!/^[0-9]{4}\/[0-9]{2}\/[0-9]{2}$/.test(req.query.date)) // YYYY/MM/DD
    return res.send("Invalid date format");
  let date=new Date(req.query.date);
  date=new Date(date*2-new Date(date.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}))); // date in Pacific Time
  let today=new Date();
  if (date-today>9*24*3600*1000)
    return res.send("Future date");
  req.query.date=req.query.date.replace(/\//g, "-"); // change to YYYY-MM-DD for database
  if (date<today-24*3600*1000) // if date is in the past
    return database.ref("locations/"+req.query.location+"/"+req.query.date).once("value").then(data=>{
      if (!data.exists()) return res.send("Not found");
      let forecast=data.val();
      return res.status(200).send(formatForecast(forecast));
    });
  if (!oauth) oauth=require("oauth"); // lazy load dependency
  let request=new oauth.OAuth(null, null, config.weather.key, config.weather.secret, "1.0", null, "HMAC-SHA1", null, null);
  return request.get("https://weather-ydn-yql.media.yahoo.com/forecastrss?format=json&location="+req.query.location, null, null, function(error, data, response) {
    if (error) return res.send("API call error");
    data=JSON.parse(data);
    if (data.location.country!=="United States") return res.send("Location not found");
    let forecast=data.forecasts.reverse().find(forecast=>{
      return date>=forecast.date*1000;
    });
    return database.ref("locations/"+req.query.location+"/"+req.query.date).set(forecast).then(()=>{
      return res.status(200).send(formatForecast(forecast));
    });
  });
});
/**
 * Formats a weather forecast entry from the API to a short, simple string.
 * This is for the golf weather function, which is not part of the hmi-grading project.
 * @param {Object} forecast object with forecast info for a specific day
 * @returns {string}        weather info in the format Temp° Condition
 */
function formatForecast(forecast) {
  return forecast.high+"° "+forecast.text.replace("Scattered", "Scat.").replace("Thunderstorms", "T-storms");
}