"use strict";

var canvas;
var gl;

var points = [];

var recursionCount = 1;
var backgroundColor = vec4(1.0, 1.0, 1.0, 1.0);
var carpetColor = vec4(0.5, 0.5, 0.5, 1.0);

var program;
var vPositionLocation;
var backgroundColorLocation;
var carpetColorLocation;

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

    vPositionLocation = gl.getAttribLocation(program, "vPosition")
    backgroundColorLocation = gl.getUniformLocation(program, "backgroundColor");
    carpetColorLocation = gl.getUniformLocation(program, "carpetColor");

    setEvent();

    drawSierpinski();
}

function setEvent() {

    var countSlide = document.getElementById("slide");
    var bgColorPicker = document.getElementById("backgroundColor");
    var carpetColorPicker = document.getElementById("carpetColor");
    var countText = document.getElementById("recursionCountText");

    recursionCount = countSlide.value;
    backgroundColor = parseColor(bgColorPicker.value);
    carpetColor = parseColor(carpetColorPicker.value);
    countText.innerHTML = "Recursion " + recursionCount;
    
    countSlide.onchange = function(evt) {
        recursionCount = evt.target.value;
        countText.innerHTML = "Recursion " + recursionCount;
        drawSierpinski();
    }

    bgColorPicker.onchange = function(evt) {
        backgroundColor = parseColor(evt.target.value);
        drawSierpinski();
    }

    carpetColorPicker.onchange = function(evt) {
        carpetColor = parseColor(evt.target.value);
        drawSierpinski();
    }
}

function parseColor(hex) {

    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    return vec4(r, g, b, 1.0);
}

function drawSierpinski() {

    points = [];
    var pos = vec2(-1, -1);
    var sideLength = 2;

    setBackgroundSquare(pos, sideLength)
    divideSquare(pos, sideLength, recursionCount);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPositionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPositionLocation);

    render();
}

function square(pos, sideLength, z) {
    
    var a = vec3(generateOffsetVector(pos, 0, sideLength), z)
    var b = vec3(generateOffsetVector(pos, sideLength, sideLength), z);
    var c = vec3(generateOffsetVector(pos, sideLength, 0), z);
    pos = vec3(pos, z);

    console.log("Square Position : " + pos + " and " + a + " and " + b + " and " + c);

    points.push(pos, a, b)
    points.push(pos, b, c)
}

function generateOffsetVector(vector, offsetX, offsetY) {

    if (!Array.isArray(vector) || vector.length != 2) {
        console.error(vector + " is not vec2");
        return null;
    }

    return vec2(vector[0] + offsetX, vector[1] + offsetY);
}

function setBackgroundSquare(pos, sideLength) {
    square(pos, sideLength, 0)
}

function divideSquare(pos, sideLength, count) {

    console.log("Divide Position" + pos + "\nSideLength: " + sideLength + "\nCount: " + count);

    if (count == 0) {
        square(pos, sideLength, 1);
    }
    else {

        count--;

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {

                if (i == 1 && j == 1) { continue; }

                divideSquare(generateOffsetVector(pos, sideLength * (i / 3.0), sideLength * (j / 3.0)), sideLength / 3.0, count);
            }
        }
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4fv(backgroundColorLocation, backgroundColor);
    gl.uniform4fv(carpetColorLocation, carpetColor);
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}