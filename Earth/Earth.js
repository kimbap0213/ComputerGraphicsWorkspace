"use strict";

var canvas;
var gl;
var program;

var points = [];
var normals = [];

var normalBuffer, vertexBuffer;
var vPosition, vNormal;

var projectionMatrix = ortho(-1.5, 1.5, -1.5, 1.5, -5.0, 5.0);

var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var waterMaterialDiffuse = vec4(0.25, 0.25, 0.75, 1.0);
var waterMaterialSpecular = vec4(0.5, 0.5, 1.0, 1.0);
var waterMaterialShininess = 10.0;

var groundMaterialDiffuse = vec4(0.05, 0.15, 0.05, 1.0);
var groundMaterialSpecular = vec4(0.05, 0.25, 0.05, 1.0);
var groundMaterialShininess = 2.0;

var snowMaterialDiffuse = vec4(0.75, 0.75, 0.75, 1.0);
var snowMaterialSpecular = vec4(0.8, 0.8, 0.8, 1.0);
var snowMaterialShininess = 30.0;

var heightLoc, height = 0.01;
var applyNormalLoc, applyNormal = 1.0;
var applyTextureLoc, applyTexture = 0.0;
var applyShadingLoc, applyShading = 1.0;

var light, lightLoc;
var eye, eyeLoc;
var modelViewMatrixLoc, modelViewMatrix;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var eyeRotation = vec2(0.0, 0.0);
var lightRotation = vec2(0.0, 0.0);

var earthElapsedTime = 0.0;
var lightElapsedTime = 0.0;
var earthDelta = 0.01;
var lightDelta = 0.01;

const heightMap = new Image();

window.onload = function loadImage() {
    heightMap.src = 'https://raw.githubusercontent.com/kimbap0213/ComputerGraphicsWorkspace/refs/heads/main/Earth/height_map.png';
    heightMap.crossOrigin = 'anonymous';
    heightMap.addEventListener('load', init);
}

function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    setAttributeLocation();
    setUniformLocation();

    setHeightMap();
    setEarthModel(50);
    setConstant();

    addEvent();
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    updateEyePosition();
    updateLightPosition();
    
    gl.uniform1f(heightLoc, height);
    gl.uniform1f(applyNormalLoc, applyNormal);
    gl.uniform1f(applyTextureLoc, applyTexture);
    gl.uniform1f(applyShadingLoc, applyShading);

    for (let i = 0; i < points.length; i += 3) {
        gl.drawArrays(gl.TRIANGLES, i, 3);
    }

    requestAnimationFrame(render);
}

function setHeightMap() {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, heightMap);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, "height"), 0);
}

function setVertex(a, b, c) {
    points.push(a);
    points.push(b);
    points.push(c);

    normals.push(a[0], a[1], a[2], 0);
    normals.push(b[0], b[1], b[2], 0);
    normals.push(c[0], c[1], c[2], 0);
}

function setEarthModel(divide) {
    points = [];
    normals = [];

    var top = vec4(0, 1, 0, 1);
    var bottom = vec4(0, -1, 0, 1);
    var verticalAngle = Math.PI / divide;
    var horizontalAngle = 2 * Math.PI / divide;

    var before = [];
    var after = [];

    for (let i = 0; i < divide; i++) {
        var y = Math.cos(verticalAngle);
        var x = Math.sin(verticalAngle) * Math.cos(i * horizontalAngle);
        var z = Math.sin(verticalAngle) * Math.sin(i * horizontalAngle);
        before.push(vec4(x, y, z, 1));
    }

    for (let i = 0; i < divide; i++) {
        setVertex(top, before[i % divide], before[(i + 1) % divide]);
    }

    for (let i = 2; i < divide; i++) {
        after = [];
        
        for (let j = 0; j < divide; j++) {
            var y = Math.cos(i * verticalAngle);
            var x = Math.sin(i * verticalAngle) * Math.cos(j * horizontalAngle);
            var z = Math.sin(i * verticalAngle) * Math.sin(j * horizontalAngle);
            after.push(vec4(x, y, z, 1));
        }

        for (let j = 0; j < divide; j++) {
            setVertex(before[j % divide], after[j % divide], before[(j + 1) % divide]);
            setVertex(after[j % divide], after[(j + 1) % divide], before[(j + 1) % divide]);
        }

        before = after;
    }

    for (let i = 0; i < divide; i++) {
        setVertex(before[i % divide], bottom, before[(i + 1) % divide]);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
}

function updateEyePosition() {
    earthElapsedTime += earthDelta;

    var horizontalCos = Math.cos(eyeRotation[0] + earthElapsedTime);
    var horizontalSin = Math.sin(eyeRotation[0] + earthElapsedTime);
    var verticalCos = Math.cos(eyeRotation[1]);
    var verticalSin = Math.sin(eyeRotation[1]);

    eye = vec3(verticalCos * horizontalCos, verticalSin, verticalCos * horizontalSin);
    up = vec3(-verticalSin * horizontalCos, verticalCos, -verticalSin * horizontalSin);

    modelViewMatrix = lookAt(eye, at, up);

    gl.uniform3fv(eyeLoc, flatten(eye));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
}

function updateLightPosition() {
    lightElapsedTime += lightDelta;

    var horizontalCos = Math.cos(lightRotation[0] + lightElapsedTime);
    var horizontalSin = Math.sin(lightRotation[0] + lightElapsedTime);
    var verticalCos = Math.cos(lightRotation[1]);
    var verticalSin = Math.sin(lightRotation[1]);

    light = vec3(verticalCos * horizontalCos, verticalSin, verticalCos * horizontalSin);

    gl.uniform3fv(lightLoc, flatten(light));
}

function addEvent() {
    var eyeHorizontal = document.getElementById("eyeHorizontal");
    var eyeVertical = document.getElementById("eyeVertical");
    var lightHorizontal = document.getElementById("lightHorizontal");
    var lightVertical = document.getElementById("lightVertical");
    var earthSpeed = document.getElementById("earthSpeed");
    var lightSpeed = document.getElementById("lightSpeed");
    var heightSlide = document.getElementById("height");
    var quantity = document.getElementById("quantity");
    var normalCheck = document.getElementById("applyOriginalNormal");
    var textureCheck = document.getElementById("applyOriginalTexture");
    var shadingCheck = document.getElementById("applyShading");

    eyeHorizontal.addEventListener('input', (e) => {
        eyeRotation[0] = e.target.valueAsNumber;
    })
    eyeVertical.addEventListener('input', (e) => {
        eyeRotation[1] = e.target.valueAsNumber;
    })
    lightHorizontal.addEventListener('input', (e) => {
        lightRotation[0] = e.target.valueAsNumber;
    })
    lightVertical.addEventListener('input', (e) => {
        lightRotation[1] = e.target.valueAsNumber;
    })
    earthSpeed.addEventListener('input', (e) => {
        earthDelta = e.target.valueAsNumber;
    })
    lightSpeed.addEventListener('input', (e) => {
        lightDelta = e.target.valueAsNumber;
    })
    heightSlide.addEventListener('input', (e) => {
        height = e.target.valueAsNumber;
    })
    quantity.addEventListener('input', (e) => {
        setEarthModel(e.target.valueAsNumber);
    })
    normalCheck.addEventListener('change', (e) => {
        applyNormal = e.target.checked ? 0.0 : 1.0;
    })
    textureCheck.addEventListener('change', (e) => {
        applyTexture = e.target.checked ? 1.0 : 0.0;
    })
    shadingCheck.addEventListener('change', (e) => {
        applyShading = e.target.checked ? 1.0 : 0.0;
    })
}

function setAttributeLocation() {
    normalBuffer = gl.createBuffer();
    vertexBuffer = gl.createBuffer();

    vNormal = gl.getAttribLocation(program, "vNormal");
    vPosition = gl.getAttribLocation(program, "vPosition");
}

function setUniformLocation() {
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    lightLoc = gl.getUniformLocation(program, "lightPosition");
    eyeLoc = gl.getUniformLocation(program, "eyePosition");
    heightLoc = gl.getUniformLocation(program, "heightScale");
    applyNormalLoc = gl.getUniformLocation(program, "applyNormal");
    applyTextureLoc = gl.getUniformLocation(program, "applyTexture");
    applyShadingLoc = gl.getUniformLocation(program, "applyShading");
}

function setConstant() {
    var waterDiffuseProduct = mult(lightDiffuse, waterMaterialDiffuse);
    var waterSpecularProduct = mult(lightSpecular, waterMaterialSpecular);

    var groundDiffuseProduct = mult(lightDiffuse, groundMaterialDiffuse);
    var groundSpecularProduct = mult(lightSpecular, groundMaterialSpecular);

    var snowDiffuseProduct = mult(lightDiffuse, snowMaterialDiffuse);
    var snowSpecularProduct = mult(lightSpecular, snowMaterialSpecular);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
    
    gl.uniform4fv(gl.getUniformLocation(program, "waterDiffuseProduct"), flatten(waterDiffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "waterSpecularProduct"), flatten(waterSpecularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "waterShininess"), waterMaterialShininess);

    gl.uniform4fv(gl.getUniformLocation(program, "groundDiffuseProduct"), flatten(groundDiffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "groundSpecularProduct"), flatten(groundSpecularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "groundShininess"), groundMaterialShininess);

    gl.uniform4fv(gl.getUniformLocation(program, "snowDiffuseProduct"), flatten(snowDiffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "snowSpecularProduct"), flatten(snowSpecularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "snowShininess"), snowMaterialShininess);
}