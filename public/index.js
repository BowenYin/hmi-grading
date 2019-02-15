const gradeForm=firebase.functions().httpsCallable("gradeForm");
var canvasEl, fieldEl;
var app=new Vue({
  el: "#app",
  beforeCreate: function() {
    //this.$vuetify.theme.primary
  },
  data: {
    loading: true,
    container: false,
    fields: false,
    video: false,
    videoEl: {},
    containerEl: {},
    dialogs: {
      setup: true,
      error: false,
      result: false
    },
    settings: {
      password: "",
      id: "",
      form: {}
    },
    camera: {
      width: 0,
      height: 0,
      image: ""
    },
    errorMsg: "",
    ids: [],
    forms: [],
    images: [],
    field: {},
  },
  computed: {
    containerWidth: function() {
      return this.settings.form.height/this.settings.form.width*this.videoEl.offsetHeight || this.container;
    },
    containerHeight: function() {
      return this.settings.form.width/this.settings.form.height*this.videoEl.offsetWidth || this.container;
    },
    fieldWidth: function() {
      return this.settings.form.fieldWidth/this.settings.form.width*this.containerEl.clientWidth || this.fields;
    },
    fieldHeight: function() {
      return this.settings.form.fieldHeight/this.settings.form.height*this.containerEl.clientHeight || this.fields;
    },
    gap: function() {
      return (this.videoEl.offsetWidth-this.containerEl.clientWidth)/2 || this.fields;
    }
  },
  mounted: function() {
    this.containerEl=document.getElementById("container");
    this.videoEl=document.getElementById("video");
    canvasEl=document.getElementById("canvas");
    fieldEl=document.getElementById("field");
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
      this.videoEl.pause();
      context.drawImage(this.videoEl, 0, 0, this.camera.width/4, this.camera.height/4);
      this.videoEl.srcObject.getVideoTracks()[0].stop();
      this.camera.image=canvasEl.toDataURL("image/jpeg");
      this.loading=false;
      this.container=this.fields=false;
      this.video=false;
    },
    cancel: function() {
      navigator.mediaDevices.getUserMedia({
        video: {facingMode: "environment", height: 4096, width: 4096}
      }).then(stream=>{
        this.videoEl.srcObject=stream;
        this.loading=false;
        this.videoEl.addEventListener("canplay", event=>{
          this.camera.width=this.videoEl.videoWidth;
          this.camera.height=this.videoEl.videoHeight;
          this.container=true;
          Vue.nextTick(()=>{
            this.fields=true;
          });
        });
      }).catch(err=>{
        this.errorMsg=err.message;
        this.dialogs.error=true;
      });
      this.video=true;
    },
    grade: function() {
      this.loading=true;
      let context=fieldEl.getContext("2d");
      this.settings.form.fields.forEach(field=>{
        context.drawImage();
      });
      gradeForm({
        id: this.settings.id,
        password: this.settings.password,
        form: this.settings.form.name,
        images: this.images,
      }).then(result=>{
        
      }).catch(err=>{
        this.errorMsg=err.message;
        this.dialogs.error=true;
      });
    }
  }
});