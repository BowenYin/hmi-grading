const gradeForm=firebase.functions().httpsCallable("gradeForm");
var canvasEl, fieldEl;
var app=new Vue({
  el: "#app",
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
      front: false,
      image: ""
    },
    errorMsg: "",
    ids: [],
    forms: [],
    images: [],
    results: {}
  },
  computed: {
    containerWidth: function() { // maximum container box height allowed
      return this.settings.form.width/this.settings.form.height*this.videoEl.offsetHeight || this.container;
    },
    containerHeight: function() { // initial container box width
      return this.settings.form.height/this.settings.form.width*this.videoEl.offsetWidth || this.container;
    },
    fieldWidth: function() {
      return this.settings.form.fieldWidth/this.settings.form.width*this.containerEl.clientWidth || this.fields;
    },
    fieldHeight: function() {
      return this.settings.form.fieldHeight/this.settings.form.height*this.containerEl.clientHeight || this.fields;
    },
    fieldX: function() { // horizontal total base offset of each field
      return this.containerEl.clientWidth/this.settings.form.width || this.fields;
    },
    fieldY: function() { // vertical total base offset of each field
      return this.containerEl.clientHeight/this.settings.form.height || this.fields;
    },
    gap: function() { // gap between left side of video element and container box
      return (this.videoEl.offsetWidth-this.containerEl.clientWidth)/2 || this.fields;
    },
    scale: function() { // scale for full-resolution picture compared to screen display
      return this.videoEl.videoWidth/this.camera.width;
    },
    lowConfidence: function() { // number of low-confidence results
      if (!this.results.results) return;
      return this.results.results.reduce((count, field)=>field.confidence<0.75?count+1:count, 0);
    }
  },
  mounted: function() {
    this.containerEl=document.getElementById("container");
    this.videoEl=document.getElementById("video");
    canvasEl=document.getElementById("canvas");
    fieldEl=document.getElementById("field");
    firebase.database().ref("/ids").on("value", snapshot=>{
      let val=snapshot.val();
      this.ids=[]; // clear ids on each update
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
      context.drawImage(this.videoEl, 0, 0, this.videoEl.videoWidth/2, this.videoEl.videoHeight/2);
      this.camera.image=canvasEl.toDataURL("image/jpeg");
      this.video=this.container=this.loading=false;
    },
    start: function() {
      this.fields=false;
      navigator.mediaDevices.getUserMedia({
        video: {facingMode: this.camera.front?"user":"environment", height: 4096, width: 4096}
      }).then(stream=>{
        this.videoEl.srcObject=stream;
        this.loading=false;
        this.videoEl.addEventListener("canplay", event=>{
          this.camera.width=this.videoEl.offsetWidth;
          this.camera.height=this.videoEl.offsetHeight;
          this.container=true;
          Vue.nextTick(()=>{this.fields=true});
        });
      }).catch(err=>{
        this.errorMsg=err.message;
        this.dialogs.error=true;
      });
      this.video=true;
    },
    stop: function() {
      this.loading=true;
      this.videoEl.pause();
      this.videoEl.srcObject.getVideoTracks()[0].stop();
      this.video=this.container=false;
    },
    cancel: function() {
      this.fields=this.loading=false;
      this.videoEl.play();
      this.container=this.video=true;
      Vue.nextTick(()=>{this.fields=true});
    },
    grade: function() {
      this.loading=true;
      let context=fieldEl.getContext("2d");
      this.settings.form.fields.forEach(field=>{
        context.drawImage(this.videoEl,
          (this.gap+field.x*this.fieldX)*this.scale,
          (this.containerEl.clientTop+field.y*this.fieldY)*this.scale,
          this.fieldWidth*this.scale, this.fieldHeight*this.scale,
          0, 0, this.fieldWidth*this.scale, this.fieldHeight*this.scale);
        this.images.push(fieldEl.toDataURL("image/jpeg"));
      });
      gradeForm({
        id: this.settings.id,
        password: this.settings.password,
        form: this.settings.form.name,
        images: this.images,
      }).then(results=>{
        this.results=results.data;
        this.dialogs.result=true;
        this.loading=false;
      }).catch(err=>{
        this.errorMsg=err.message;
        this.dialogs.error=true;
        this.loading=false;
        this.cancel();
      });
      this.images=[];
    }
  }
});