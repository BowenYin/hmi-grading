require("dotenv").config(); // load password environment variable
const functions=require("firebase-functions");
const admin=require("firebase-admin");
const axios=require("axios");
const https=require("https");
admin.initializeApp();
var firestore=admin.firestore();
var database=admin.database();
var answers={}; // cache answer lists
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
exports.grade=functions.https.onCall((data, context)=>{
  if (data.password!==process.env.PASSWORD)
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
    let requests=[];
    var results=[];
    var score=0;
    
    data.images.forEach(image=>{
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