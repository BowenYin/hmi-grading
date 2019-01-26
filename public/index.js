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
      let specs=stream.getVideoTracks()[0].getSettings();
      this.width=specs.width;
      this.height=specs.height;
      this.loading=false;
    }).catch(err=>{
      this.error=true;
      this.errorMsg=err.message;
    });
  },
  methods: {
    camera: function() {
      this.loading=true;
      let context=canvas.getContext("2d");
      context.drawImage(video, 0, 0, this.width, this.height);
      video.srcObject.getVideoTracks()[0].stop();
      this.image=canvas.toDataURL();
      this.video=false;
    }
  }
});