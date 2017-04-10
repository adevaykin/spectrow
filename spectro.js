var gl;
var canvas;
var squareVerticesBuffer;
var squareUVBuffer;
var squareIdxBuffer;
var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var vertexUVAttribute;
var orthoMatrix;

var cubeTexture;
var cubeImage;

function initWebGL(canv) {
  gl = null;

  // Try to grab the standard context. If it fails, fallback to experimental.
  gl = canv.getContext('webgl') || canv.getContext('experimental-webgl');

  // If we don't have a GL context, give up now
  if (!gl) {
    alert('Unable to initialize WebGL. Your browser may not support it.');
  }

  return gl;
}

function getShader(gl, id, type) {
  var shaderScript, theSource, currentChild, shader;

  shaderScript = document.getElementById(id);

  if (!shaderScript) {
    return null;
  }

  theSource = shaderScript.text;

  if (!type) {
    if (shaderScript.type == 'x-shader/x-fragment') {
      type = gl.FRAGMENT_SHADER;
    } else if (shaderScript.type == 'x-shader/x-vertex') {
      type = gl.VERTEX_SHADER;
    } else {
      // Unknown shader type
      return null;
    }
  }
  shader = gl.createShader(type);

  gl.shaderSource(shader, theSource);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
  }

  return shader;
}

function initShaders() {
  var fragmentShader = getShader(gl, 'shader-fs');
  var vertexShader = getShader(gl, 'shader-vs');

  // Create the shader program

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
  }

  gl.useProgram(shaderProgram);

  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
  gl.enableVertexAttribArray(vertexPositionAttribute);

  vertexUVAttribute = gl.getAttribLocation(shaderProgram, 'aUVPositions');
  gl.enableVertexAttribArray(vertexUVAttribute);
}

function initBuffers() {
  var vertices = [
    -1.0,  1.0, 0.0,
    -1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,
     1.0, -1.0, 0.0
  ];

  var uv = [
    1.0, 0.0,
    1.0, 1.0,
    0.0, 0.0,
    0.0, 1.0
  ];

  var indices = [
    0, 1, 2,
    2, 1, 3
  ]

  squareVerticesBuffer = gl.createBuffer();
  squareUVBuffer = gl.createBuffer();
  squareIdxBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIdxBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

function loadIdentity() {
  mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
  mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
  multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

function setAttributes() {
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareUVBuffer);
  gl.vertexAttribPointer(vertexUVAttribute, 2, gl.FLOAT, false, 0, 0);
}

function setUniforms() {
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.uniformMatrix4fv(pUniform, false, new Float32Array(orthoMatrix.flatten()));

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));

  var sceen_width_uniform = gl.getUniformLocation(shaderProgram, "screen_width");
  var sceen_height_uniform = gl.getUniformLocation(shaderProgram, "screen_height");
  gl.uniform1i(sceen_width_uniform, canvas.width);
  gl.uniform1i(sceen_height_uniform, canvas.height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  orthoMatrix = makeOrtho(-1.0, 1.0, -1.0, 1.0, 0.1, 100.0);

  loadIdentity();
  mvTranslate([0.0, 0.0, -0.2]);

  setAttributes();
  setUniforms();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIdxBuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function handleTextureLoaded(image, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 64, 64, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(image));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function initTextures() {
  cubeTexture = gl.createTexture();

  cubeImage = Array.apply(null, Array(64*64*3)).map(Number.prototype.valueOf, 128);
  for(i=0; i<64*3; i+=3) {
    cubeImage[i] = 255;
  }

  for(i=1; i<64*3; i+=3) {
    cubeImage[i+64*3] = 255;
  }

  for(i=2; i<64*3; i+=3) {
    cubeImage[i+64*3*2] = 255;
  }

  handleTextureLoaded(cubeImage, cubeTexture);
}

function start() {
  canvas = document.getElementById('glCanvas');

  // Initialize the GL context
  gl = initWebGL(canvas);

  // Only continue if WebGL is available and working
  if (!gl) {
    return;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);

  // Set clear color to black, fully opaque
  gl.clearColor(0.0, 0.4, 0.0, 1.0);
  // Enable depth testing
  gl.enable(gl.DEPTH_TEST);
  // Near things obscure far things
  gl.depthFunc(gl.LEQUAL);
  // Clear the color as well as the depth buffer.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  initShaders();
  initBuffers();
  initTextures();

  setInterval(drawScene, 500);
}
