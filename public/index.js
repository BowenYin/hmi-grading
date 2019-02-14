const gradeForm=firebase.functions().httpsCallable("gradeForm");
var videoEl, canvasEl;
var app=new Vue({
  el: "#app",
  beforeCreate: function() {
    //this.$vuetify.theme.primary
  },
  data: {
    loading: true,
    video: true,
    dialogs: {
      setup: true,
      error: false,
      result: false
    },
    settings: {
      password: "",
      id: "",
      form: ""
    },
    camera: {
      width: 0,
      height: 0,
      image: ""
    },
    errorMsg: "",
    ids: [],
    forms: [],
    answerForm: {},
    field: {},
  },
  mounted: function() {
    videoEl=document.getElementById("video");
    canvasEl=document.getElementById("canvas");
    firebase.database().ref("/ids").once("value").then(snapshot=>{
      let val=snapshot.val();
      for (let id in val)
        this.ids.push({id, disabled: !val[id]});
    });
    return firebase.firestore().collection("forms").get().then(snapshot=>{
      snapshot.forEach(doc=>{
        this.forms.push(Object.assign(doc.data(), {name: doc.id}));
      });
    });
  },
  methods: {
    capture: function() {
      this.loading=true;
      let context=canvasEl.getContext("2d");
      videoEl.pause();
      context.drawImage(videoEl, 0, 0, this.camera.width/4, this.camera.height/4);
      videoEl.srcObject.getVideoTracks()[0].stop();
      this.camera.image=canvasEl.toDataURL("image/jpeg");
      this.video=false;
    },
    cancel: function() {
      navigator.mediaDevices.getUserMedia({
        video: {facingMode: "environment", height: 4096, width: 4096}
      }).then(stream=>{
        videoEl.srcObject=stream;
        this.loading=false;
        videoEl.addEventListener("canplay", event=>{
          this.camera.width=videoEl.videoWidth;
          this.camera.height=videoEl.videoHeight;
        });
      }).catch(err=>{
        this.errorMsg=err.message;
        this.dialogs.error=true;
      });
      this.video=true;
    },
    gradeForm: function() {
      gradeForm({
        id: this.answerForm.id,
        password: this.answerForm.password,
        form: this.answerForm.form,
        images: this.answerForm.images,
      }).then(result=>{
        
      }).catch(err=>{
        this.errorMsg=err.message;
        this.dialogs.error=true;
      });
    }
  }
});