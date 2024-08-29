const canvas = document.getElementById("my-canvas");

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const ctx = canvas.getContext("2d");


const clearBtn = document.getElementById("clear-btn");
const redBtn = document.getElementById("red-btn");
const blueBtn = document.getElementById("blue-btn");
const greenBtn = document.getElementById("green-btn");
const blackBtn = document.getElementById("black-btn");
const colorPicker = document.getElementById("color-picker");

let drawing = false;
let x1, y1; 

colorPicker.addEventListener("blur", (e) => {
  ctx.strokeStyle= e.target.value;
})

clearBtn.addEventListener("click", () => {
  ctx.clearRect(0,0,canvas.width, canvas.height);
})
redBtn.addEventListener("click", () => {
  ctx.strokeStyle="#FF0000";
  colorPicker.value = "#FF0000"
})
blueBtn.addEventListener("click", () => {
  ctx.strokeStyle="#0000FF";
  colorPicker.value = "#0000FF"
})
greenBtn.addEventListener("click", () => {
  ctx.strokeStyle="#00FF00";
  colorPicker.value = "#00FF00"
})
blackBtn.addEventListener("click", () => {
  ctx.strokeStyle="black";
  colorPicker.value = "#000000"
})

canvas.addEventListener("mousedown", (e) => {
  init(e);
})
canvas.addEventListener("mousemove", (e) => {
  draw(e);
})

canvas.addEventListener("mouseup", (e) => {
  drawing = false;
})

function init(e) {
  x1 = e.offsetX; 
  y1 = e.offsetY;
  drawing = true;
}


function draw(e) {
    if (drawing) {
      ctx.beginPath(); 
      ctx.moveTo(x1, y1)
      ctx.lineTo(e.offsetX,e.offsetY);
      ctx.stroke();
      ctx.closePath()
      x1 = e.offsetX; 
      y1 = e.offsetY;
    }
}