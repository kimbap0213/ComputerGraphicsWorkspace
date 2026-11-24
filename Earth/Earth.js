"use strict";

var canvas;
var gl;

var points = [];
var normals = [];

var program;
var vPosition;
var vNormal;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var waterMaterialAmbient = vec4(0.0, 0.0, 0.5, 1.0);
var waterMaterialDiffuse = vec4(0.25, 0.25, 0.75, 1.0);
var waterMaterialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var waterMaterialShininess = 10.0;

var groundMaterialAmbient = vec4(0.15, 0.05, 0.05, 1.0);
var groundMaterialDiffuse = vec4(0.75, 0.25, 0.25, 1.0);
var groundMaterialSpecular = vec4(0.85, 0.35, 0.35, 1.0);
var groundMaterialShininess = 1.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var eye, eyeLoc;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var elapsedTime = 0.0;

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var waterAmbientProduct = mult(lightAmbient, waterMaterialAmbient);
    var waterDiffuseProduct = mult(lightDiffuse, waterMaterialDiffuse);
    var waterSpecularProduct = mult(lightSpecular, waterMaterialSpecular);

    var groundAmbientProduct = mult(lightAmbient, groundMaterialAmbient);
    var groundDiffuseProduct = mult(lightDiffuse, groundMaterialDiffuse);
    var groundSpecularProduct = mult(lightSpecular, groundMaterialSpecular);

    setEarthModel(20);

    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    vNormal = gl.getAttribLocation(program, "vNormal");
    console.log(vNormal);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    eyeLoc = gl.getUniformLocation(program, "eyePosition");

    gl.uniform4fv(gl.getUniformLocation(program, "waterAmbientProduct"), flatten(waterAmbientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "waterDiffuseProduct"), flatten(waterDiffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "waterSpecularProduct"), flatten(waterSpecularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "waterShininess"), waterMaterialShininess);

    gl.uniform4fv(gl.getUniformLocation(program, "groundAmbientProduct"), flatten(groundAmbientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "groundDiffuseProduct"), flatten(groundDiffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "groundSpecularProduct"), flatten(groundSpecularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "groundShininess"), groundMaterialShininess);

    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));

    setHeightMap();

    render();
}

function setHeightMap() {
    var heightMap = document.getElementById("heightMap");
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, heightMap);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(gl.getUniformLocation(program, "height"), 0);
    console.log(heightMap);
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
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(Math.cos(elapsedTime), 0.0, Math.sin(elapsedTime));

    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = ortho(-2.0, 2.0, -2.0, 2.0, -5.0, 5.0);

    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2]),
    ];

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
    gl.uniform3fv(eyeLoc, flatten(eye));

    for (let i = 0; i < points.length; i += 3) {
        gl.drawArrays(gl.TRIANGLES, i, 3);
    }

    elapsedTime += 0.005;
    requestAnimationFrame(render);
}