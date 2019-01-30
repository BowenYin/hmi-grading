var app=new Vue({
  el: "#app",
  beforeCreate: function() {
    this.$vuetify.theme.primary
  },
  data: {
    loading: true,
    video: true,
    dialog: false,
    error: false,
    errorMsg: "",
    width: 0,
    height: 0,
    image: ""
  },
  mounted: function() {
    const video=document.getElementById("video");
    const canvas=document.getElementById("canvas");
    navigator.mediaDevices.getUserMedia({
      video: {facingMode: "environment", height: 4096, width: 4096}
    }).then(stream=>{
      video.srcObject=stream;
      this.loading=false;
      video.addEventListener("canplay", event=>{
        this.width=video.videoWidth;
        this.height=video.videoHeight;
      });
    }).catch(err=>{
      this.error=true;
      this.errorMsg=err.message;
    });
  },
  methods: {
    capture: function() {
      this.loading=true;
      let context=canvas.getContext("2d");
      video.pause();
      context.drawImage(video, 0, 0, this.width/4, this.height/4);
      video.srcObject.getVideoTracks()[0].stop();
      this.image=canvas.toDataURL("image/jpeg");
      this.video=false;
    }
  }
});