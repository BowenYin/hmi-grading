var oauth; // to be lazy loaded later
const functions=require("firebase-functions");
const admin=require("firebase-admin");
const axios=require("axios");
const https=require("https");
admin.initializeApp();
const firestore=admin.firestore();
const database=admin.database();
const config=functions.config(); // environment config variables
const httpsAgent=new https.Agent({keepAlive: true});
var answers={}; // cache answer lists
/**
 * Grades a given list of images represented as data URIs.
 * @param {string} id       ID to use for external API request
 * @param {string} password global password for all calls
 * @param {string} form     exact name of the answer sheet form that should be used
 * @param {string[]} images list of image data URIs that should be graded
 * @returns {Object}        object containing a total score and an array of fields
 */
exports.gradeForm=functions.https.onCall((data, context)=>{
  console.log({id: data.id, form: data.form});
  if (data.password!==config.hmi.password)
    throw new functions.https.HttpsError("permission-denied", "Incorrect password");
  var key; // credentials for API from database
  return database.ref("keys/"+data.id).once("value").then(snapshot=>{
    key=snapshot.val();
    if (!key.available)
      throw new functions.https.HttpsError("unavailable", "ID "+data.id+" is unavailable.");
    if (answers[data.form]) return answers[data.form]; // answer sheet is cached
    return firestore.collection("answers").doc(data.form).get().then(doc=>{
      doc=doc.data();
      if (doc.disabled)
        throw new functions.https.HttpsError("unavailable", "Form "+data.form+" is unavailable.");
      return answers[data.form]=doc; // cache answer form
    });
  }).then(form=>{
    let requests=[], results=[], score=0;
    data.images.forEach(image=>{
      requests.push(axios.post("https://api.mathpix.com/v3/latex", {
        src: image,
        ocr: ["math", "text"],
        formats: ["latex_normal", "latex_raw"]
      }, {headers: {
        "app_id": data.id,
        "app_key": key.key,
        "Content-Type": "application/json"
      }, httpsAgent}));
    });
    return Promise.all(requests).then(responses=>{
      responses.forEach((res, index)=>{
        let result={
          name: form.fields[index].name || index,
          latex: res.data.latex_normal,
          confidence: res.data.latex_confidence
        };
        if (res.data.error_info) result.latex=res.data.error_info.message;
        if (form.fields[index].answers.includes(res.data.latex_normal) || form.fields[index].answers.includes(res.data.latex_raw)) {
          result.correct=true;
          score++;
        } else result.correct=false;
        results.push(result);
      });
      return {score, results};
    });
  });
});
exports.addForm=functions.https.onRequest((req, res)=>{
  console.log({form: req.body.name, userAgent: req.get("User-Agent")});
  if (req.body.password!==config.hmi.adminpass)
    return res.status(401).send("Not authorized");
  return firestore.collection("forms").doc(req.body.name).create(req.body.doc).then(()=>{
    return res.status(200).send("Success");
  }).catch(error=>{
    console.error(error);
    return res.status(500).send("Error");
  });
});
exports.addAnswerSheet=functions.https.onRequest((req, res)=>{
  console.log({form: req.body.name, userAgent: req.get("User-Agent")});
  if (req.body.password!==config.hmi.adminpass)
    return res.status(401).send("Not authorized");
  return firestore.collection("answers").doc(req.body.name).create(req.body.doc).then(()=>{
    return res.status(200).send("Success");
  }).catch(error=>{
    console.error(error);
    return res.status(500).send("Error");
  });
});
exports.downloadForm=functions.https.onRequest((req, res)=>{
  console.log({form: req.body.name, userAgent: req.get("User-Agent")});
  if (req.body.password!==config.hmi.adminpass)
    return res.status(401).send("Not authorized");
  return firestore.collection("forms").doc(req.body.name).get().then(doc=>{
    return res.status(200).send(doc.data());
  }).catch(error=>{
    console.error(error);
    return res.status(500).send("Error");
  });
});
exports.downloadAnswerSheet=functions.https.onRequest((req, res)=>{
  console.log({form: req.body.name, userAgent: req.get("User-Agent")});
  if (req.body.password!==config.hmi.adminpass)
    return res.status(401).send("Not authorized");
  return firestore.collection("answers").doc(req.body.name).get().then(doc=>{
    return res.status(200).send(doc.data());
  }).catch(error=>{
    console.error(error);
    return res.status(500).send("Error");
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
  console.log({date: req.query.date, location: req.query.location, userAgent: req.get("User-Agent")});
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