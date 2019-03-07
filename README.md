## HMI Grading
> Read my general [Philosophy](#philosophy) at the bottom of this file, since I decided to put it into this project after I couldn't think of anywhere else.

### Background
The Harker Math Invitational (HMI) is an annual math competition for middle schoolers held at The Harker School since 2002, with over 300 contestants last year. Due to the packed schedule and sheer number of students, accurately grading all the contests in a short amount of time has become a challenge, often resulting in the awards ceremony being pushed back by up to an hour. That's why I decided to make this.

### Description
My goal was to create a web app (because that's much more easily accessible and much easier to make than mobile apps on two different operating systems) that could quickly score an answer sheet scanned right from a phone camera.

First, the user enters the master password, selects from a list of available API IDs, and also chooses an answer form to be used.

The full-screen camera page is overlaid with boxes showing the outline of the container and each of the fields to be graded.

Results are displayed in a clean two-column list, showing the field name, confidence level, and raw LaTeX from the OCR.

### Technologies
* Vue.js: fastest growing JavaScript framework
* Vuetify.js: beautiful and popular material design framework for Vue
* Firebase: along with GCP, just another trusted product by Google
  * Cloud Firestore: flexible, scalable NoSQL database
  * Realtime Database: low-latency JSON database
  * Cloud Functions w/ Node.js: literally the coolest thing ever
  * Firebase Hosting: fast, secure, and easy to use
* Mathpix: an interesting math OCR API

### Screenshots
> `Note:` Just to reiterate, this was NOT intended to be a complex or time-consuming project. All in all, this only took me about two and a half weeks (including school time) of sparse work.

The "container" is outlined in green below, and is a custom ratio box where all of the fields are. Each of the "fields" is outlined in blue and represents an answer to be scored.
<p align="middle">
  <img src="/images/start.png" width="250">
  <img src="/images/camera.png" width="250"> 
  <img src="/images/results.png" width="250">
</p>

### Technical Details
* Tested on Chrome for Android and Safari for iOS. Also works on modern desktop browsers.
* Fully responsive
* Secure, with built-in ways to prevent API overuse
* WebRTC camera
  * `Warning:` this web app *may* drain your battery as it requests the highest possible camera resolution for your device (so that the math recognition is as accurate as possible)
  * Images are drawn onto an HTML canvas element, then converted to JPEG data URIs
* Overlay boxes
  * Dimensions for the client display are calculated using ratios retrieved from the database and based on the viewport size
  * Dimensions for the images captured are calculated using a scale compared to the display dimensions
  * Because it uses ratios only, dimensions stored in the database may have **any unit of measure** (in, cm, px, km, etc.) as long as it is consistent throughout all the values in a given answer form.
#### Mathpix LaTeX Reference
Math | LaTeX
---- | -----
% | `\%`
$ | `\$`
π | `\pi`
• | `\cdot`
° | `^ { \circ }`
text | `\text { text }`
½ | `\frac { 1 } { 2 }`
1/2 | `1 / 2`
√x | `\sqrt { x }`
1:23 pm | `1 : 23 p m`, `1 : 23 pm`, `1 : 23`
5280 ft | `5280 ft`, `5280`
#### Database schema
```
COLLECTION forms: { // public
  DOC {formName}: {
    disabled: boolean,
    height: number, // container height
    width: number, // container width
    fieldHeight: number,
    fieldWidth: number,
    fields: [
      {
        x: number,
        y: number
      },
      ...
    ]
  },
  ...
}
```
```
COLLECTION answers: { // private
  DOC {formName}: {
    disabled: boolean,
    fields: [
      {
        name: string, // example: Problem 27
        answers: [string, ...] // in LaTeX
      },
      ...
    ]
  },
  ...
}
```
<a href="https://crossbrowsertesting.com" target="_blank">
  <img src="https://i.postimg.cc/k5qVGBcP/CBT-OS-logo-2-Color-H.png" alt="CrossBrowserTesting" width="250">
</a>

### Philosophy
This is my current working philosophy that covers my general beliefs about writing code.
1. Write effective, concise code. Short code is smart code.
   * I think verbose code that walks through baby steps actually decreases readibility.
2. Minimize dependencies. Only use popular and trusted ones.
   * The only dependencies this project uses—Vue.js, Vuetify.js, the Firebase suite, and Axios—are all fairly well-known ones.
3. Make your life easier. Don't reinvent the wheel.
   * For example, don't use Node.js HTTP when you can save much more time with Request or Axios.
   * Or, you don't need to manage your sessions, cookies, tokens, etc. when a service like Firebase Auth can seamlessly do it all for you.
###### These are especially true since I'm a busy high school student right now, not a full-time software engineer. Also because of this, my philosophy will change in the future.
