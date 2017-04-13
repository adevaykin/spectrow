Spectrow = function (canvas_id) {
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

  this.plot_texture;
  this.noise_data = Array.apply(null, Array(256 * 128 * 3)).map(Number.prototype.valueOf, 128);

  this.initWebGL = function initWebGL(canv) {
    this.gl = canv.getContext('webgl') || canv.getContext('experimental-webgl');

    if (!this.gl) {
      alert('SpectroW: Unable to initialize WebGL. Your browser may not support it.');
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
        return null;
      }
    }
    shader = this.gl.createShader(type);

    this.gl.shaderSource(shader, theSource);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log('SpectroW: An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  this.initShaders = function initShaders() {
    var fragmentShader = this.getShader(this.gl, 'shader-fs');
    var vertexShader = this.getShader(this.gl, 'shader-vs');

    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.log('SpectroW: Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram));
    }

    this.gl.useProgram(this.shaderProgram);

    this.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
    this.gl.enableVertexAttribArray(this.vertexPositionAttribute);

    this.vertexUVAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aUVPositions');
    this.gl.enableVertexAttribArray(this.vertexUVAttribute);
  }

  this.initBuffers = function initBuffers() {
    var vertices = [
      -1.0, 1.0, 0.0,
      -1.0, -1.0, 0.0,
      1.0, 1.0, 0.0,
      1.0, -1.0, 0.0
    ];

    var uv = [
      0.0, 1.0,
      1.0, 1.0,
      0.0, 0.0,
      1.0, 0.0
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
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.plot_texture);
    this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uSampler'), 0);
  }

  this.drawScene = function drawScene() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.orthoMatrix = makeOrtho(-1.0, 1.0, -1.0, 1.0, 0.1, 100.0);

    this.loadIdentity();
    this.mvTranslate([0.0, 0.0, -0.2]);

    this.setAttributes();
    this.setUniforms();

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.squareIdxBuffer);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  this.handleTextureLoaded = function handleTextureLoaded(image, texture) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, 128, 256, 0, this.gl.RGB, this.gl.UNSIGNED_BYTE, new Uint8Array(this.noise_data));
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  this.initTextures = function initTextures() {
    this.plot_texture = this.gl.createTexture();

    this.handleTextureLoaded(null, this.plot_texture);
  }

  this.start = function start() {
    this.gl = this.initWebGL(this.canvas);

    if (!this.gl) {
      console.log("SpectroW: Failed to initialize WebGL contenxt.");
      return;
    }

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0.0, 0.4, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.initShaders();
    this.initBuffers();
    this.initTextures();

    this.drawScene();
  }

  this.appendLine = function appendLine(line_data) {
    this.noise_data = this.noise_data.slice(0, 256*128*3-line_data.length);
    this.noise_data = line_data.concat(this.noise_data);
  }

  this.updateRender = function updateRender() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.plot_texture);
    this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 128, 256, this.gl.RGB, this.gl.UNSIGNED_BYTE, new Uint8Array(this.noise_data));
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.drawScene()
  }
}
