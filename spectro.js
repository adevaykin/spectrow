Spectrow = function(canvas_id) {
this.canvas = document.getElementById(canvas_id);

this.gl;
this.canvas;
this.squareVerticesBuffer;
this.squareUVBuffer;
this.squareIdxBuffer;
this.mvMatrix;
this.shaderProgram;
this.vertexPositionAttribute;
this.vertexUVAttribute;
this.orthoMatrix;

this.cubeTexture;
this.cubeImage;

this.initWebGL = function initWebGL(canv) {
  this.gl = null;

  // Try to grab the standard context. If it fails, fallback to experimental.
  this.gl = canv.getContext('webgl') || canv.getContext('experimental-webgl');

  // If we don't have a GL context, give up now
  if (!this.gl) {
    alert('Unable to initialize WebGL. Your browser may not support it.');
  }

  return this.gl;
}

this.getShader = function getShader(gl, id, type) {
  var shaderScript, theSource, currentChild, shader;

  shaderScript = document.getElementById(id);

  if (!shaderScript) {
    return null;
  }

  theSource = shaderScript.text;

  if (!type) {
    if (shaderScript.type == 'x-shader/x-fragment') {
      type = this.gl.FRAGMENT_SHADER;
    } else if (shaderScript.type == 'x-shader/x-vertex') {
      type = this.gl.VERTEX_SHADER;
    } else {
      // Unknown shader type
      return null;
    }
  }
  shader = this.gl.createShader(type);

  this.gl.shaderSource(shader, theSource);

  // Compile the shader program
  this.gl.compileShader(shader);

  // See if it compiled successfully
  if (!this.gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
  }

  return shader;
}

this.initShaders = function initShaders() {
  var fragmentShader = this.getShader(this.gl, 'shader-fs');
  var vertexShader = this.getShader(this.gl, 'shader-vs');

  // Create the shader program

  this.shaderProgram = this.gl.createProgram();
  this.gl.attachShader(this.shaderProgram, vertexShader);
  this.gl.attachShader(this.shaderProgram, fragmentShader);
  this.gl.linkProgram(this.shaderProgram);

  // If creating the shader program failed, alert

  if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
    console.log('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram));
  }

  this.gl.useProgram(this.shaderProgram);

  this.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
  this.gl.enableVertexAttribArray(this.vertexPositionAttribute);

  this.vertexUVAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aUVPositions');
  this.gl.enableVertexAttribArray(this.vertexUVAttribute);
}

this.initBuffers = function initBuffers() {
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

  this.squareVerticesBuffer = this.gl.createBuffer();
  this.squareUVBuffer = this.gl.createBuffer();
  this.squareIdxBuffer = this.gl.createBuffer();

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVerticesBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareUVBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uv), this.gl.STATIC_DRAW);

  this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.squareIdxBuffer);
  this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
}

this.loadIdentity = function loadIdentity() {
  this.mvMatrix = Matrix.I(4);
}

this.multMatrix = function multMatrix(m) {
  this.mvMatrix = this.mvMatrix.x(m);
}

this.mvTranslate = function mvTranslate(v) {
  this.multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

this.setAttributes = function setAttributes() {
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVerticesBuffer);
  this.gl.vertexAttribPointer(this.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareUVBuffer);
  this.gl.vertexAttribPointer(this.vertexUVAttribute, 2, this.gl.FLOAT, false, 0, 0);
}

this.setUniforms = function setUniforms() {
  var pUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
  this.gl.uniformMatrix4fv(pUniform, false, new Float32Array(this.orthoMatrix.flatten()));

  var mvUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
  this.gl.uniformMatrix4fv(mvUniform, false, new Float32Array(this.mvMatrix.flatten()));

  var sceen_width_uniform = this.gl.getUniformLocation(this.shaderProgram, "screen_width");
  var sceen_height_uniform = this.gl.getUniformLocation(this.shaderProgram, "screen_height");
  this.gl.uniform1i(sceen_width_uniform, this.canvas.width);
  this.gl.uniform1i(sceen_height_uniform, this.canvas.height);

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.cubeTexture);
  this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uSampler'), 0);
}

this.drawScene = function drawScene(inst) {
  inst.gl.clear(inst.gl.COLOR_BUFFER_BIT | inst.gl.DEPTH_BUFFER_BIT);

  inst.orthoMatrix = makeOrtho(-1.0, 1.0, -1.0, 1.0, 0.1, 100.0);

  inst.loadIdentity();
  inst.mvTranslate([0.0, 0.0, -0.2]);

  inst.setAttributes();
  inst.setUniforms();

  inst.gl.bindBuffer(inst.gl.ELEMENT_ARRAY_BUFFER, inst.squareIdxBuffer);
  inst.gl.drawArrays(inst.gl.TRIANGLE_STRIP, 0, 4);
}

this.handleTextureLoaded = function handleTextureLoaded(image, texture) {
  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, 64, 64, 0, this.gl.RGB, this.gl.UNSIGNED_BYTE, new Uint8Array(image));
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
  this.gl.generateMipmap(this.gl.TEXTURE_2D);
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

this.initTextures = function initTextures() {
  this.cubeTexture = this.gl.createTexture();

  this.cubeImage = Array.apply(null, Array(64*64*3)).map(Number.prototype.valueOf, 128);
  for(i=0; i<64*3; i+=3) {
    this.cubeImage[i] = 255;
  }

  for(i=1; i<64*3; i+=3) {
    this.cubeImage[i+64*3] = 255;
  }

  for(i=2; i<64*3; i+=3) {
    this.cubeImage[i+64*3*2] = 255;
  }

  this.handleTextureLoaded(this.cubeImage, this.cubeTexture);
}

this.start = function start() {
  // Initialize the GL context
  this.gl = this.initWebGL(this.canvas);

  // Only continue if WebGL is available and working
  if (!this.gl) {
    return;
  }

  this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

  // Set clear color to black, fully opaque
  this.gl.clearColor(0.0, 0.4, 0.0, 1.0);
  // Enable depth testing
  this.gl.enable(this.gl.DEPTH_TEST);
  // Near things obscure far things
  this.gl.depthFunc(this.gl.LEQUAL);
  // Clear the color as well as the depth buffer.
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

  this.initShaders();
  this.initBuffers();
  this.initTextures();

  setInterval(this.drawScene(this), 500);
}

}
