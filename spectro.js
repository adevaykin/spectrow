Spectrow = function (canvas_id) {
  var canvas_element = document.getElementById(canvas_id);

  var gl_context;
  var vertex_buffer;
  var uv_buffer;
  var vertex_idx_buffer;
  var mv_matrix;
  var shader_program;
  var vertex_pos_attr;
  var vertex_uv_attr;
  var projection_matrix;

  var plot_texture;
  var spec_data = Array.apply(null, Array(256 * 128 * 3)).map(Number.prototype.valueOf, 128);

  var initWebGL = function initWebGL(canv) {
    gl_context = canv.getContext('webgl') || canv.getContext('experimental-webgl');

    if (!gl_context) {
      alert('SpectroW: Unable to initialize WebGL. Your browser may not support it.');
    }

    return gl_context;
  }

  var getShader = function getShader(gl, id, type) {
    var shaderScript, theSource, currentChild, shader;

    shaderScript = document.getElementById(id);

    if (!shaderScript) {
      return null;
    }

    theSource = shaderScript.text;

    if (!type) {
      if (shaderScript.type == 'x-shader/x-fragment') {
        type = gl_context.FRAGMENT_SHADER;
      } else if (shaderScript.type == 'x-shader/x-vertex') {
        type = gl_context.VERTEX_SHADER;
      } else {
        return null;
      }
    }
    shader = gl_context.createShader(type);

    gl_context.shaderSource(shader, theSource);
    gl_context.compileShader(shader);

    if (!gl_context.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('SpectroW: An error occurred compiling the shaders: ' + gl_context.getShaderInfoLog(shader));
      gl_context.deleteShader(shader);
      return null;
    }

    return shader;
  }

  var initShaders = function initShaders() {
    var fragmentShader = getShader(gl_context, 'shader-fs');
    var vertexShader = getShader(gl_context, 'shader-vs');

    shader_program = gl_context.createProgram();
    gl_context.attachShader(shader_program, vertexShader);
    gl_context.attachShader(shader_program, fragmentShader);
    gl_context.linkProgram(shader_program);

    if (!gl_context.getProgramParameter(shader_program, gl_context.LINK_STATUS)) {
      console.error('SpectroW: Unable to initialize the shader program: ' + gl_context.getProgramInfoLog(shader_program));
    }

    gl_context.useProgram(shader_program);

    vertex_pos_attr = gl_context.getAttribLocation(shader_program, 'aVertexPosition');
    gl_context.enableVertexAttribArray(vertex_pos_attr);

    vertex_uv_attr = gl_context.getAttribLocation(shader_program, 'aUVPositions');
    gl_context.enableVertexAttribArray(vertex_uv_attr);
  }

  var initBuffers = function initBuffers() {
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

    vertex_buffer = gl_context.createBuffer();
    uv_buffer = gl_context.createBuffer();
    vertex_idx_buffer = gl_context.createBuffer();

    gl_context.bindBuffer(gl_context.ARRAY_BUFFER, vertex_buffer);
    gl_context.bufferData(gl_context.ARRAY_BUFFER, new Float32Array(vertices), gl_context.STATIC_DRAW);

    gl_context.bindBuffer(gl_context.ARRAY_BUFFER, uv_buffer);
    gl_context.bufferData(gl_context.ARRAY_BUFFER, new Float32Array(uv), gl_context.STATIC_DRAW);

    gl_context.bindBuffer(gl_context.ELEMENT_ARRAY_BUFFER, vertex_idx_buffer);
    gl_context.bufferData(gl_context.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl_context.STATIC_DRAW);
  }

  var mvTranslate = function mvTranslate(v) {
    mv_matrix = mv_matrix.x(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
  }

  var setAttributes = function setAttributes() {
    gl_context.bindBuffer(gl_context.ARRAY_BUFFER, vertex_buffer);
    gl_context.vertexAttribPointer(vertex_pos_attr, 3, gl_context.FLOAT, false, 0, 0);
    gl_context.bindBuffer(gl_context.ARRAY_BUFFER, uv_buffer);
    gl_context.vertexAttribPointer(vertex_uv_attr, 2, gl_context.FLOAT, false, 0, 0);
  }

  var setUniforms = function setUniforms() {
    var pUniform = gl_context.getUniformLocation(shader_program, "uPMatrix");
    gl_context.uniformMatrix4fv(pUniform, false, new Float32Array(projection_matrix.flatten()));

    var mvUniform = gl_context.getUniformLocation(shader_program, "uMVMatrix");
    gl_context.uniformMatrix4fv(mvUniform, false, new Float32Array(mv_matrix.flatten()));

    var sceen_width_uniform = gl_context.getUniformLocation(shader_program, "screen_width");
    var sceen_height_uniform = gl_context.getUniformLocation(shader_program, "screen_height");
    gl_context.uniform1i(sceen_width_uniform, canvas_element.width);
    gl_context.uniform1i(sceen_height_uniform, canvas_element.height);

    gl_context.activeTexture(gl_context.TEXTURE0);
    gl_context.bindTexture(gl_context.TEXTURE_2D, plot_texture);
    gl_context.uniform1i(gl_context.getUniformLocation(shader_program, 'uSampler'), 0);
  }

  var drawScene = function drawScene() {
    gl_context.clear(gl_context.COLOR_BUFFER_BIT | gl_context.DEPTH_BUFFER_BIT);

    projection_matrix = makeOrtho(-1.0, 1.0, -1.0, 1.0, 0.1, 100.0);

    mv_matrix = Matrix.I(4);
    mvTranslate([0.0, 0.0, -0.2]);

    setAttributes();
    setUniforms();

    gl_context.bindBuffer(gl_context.ELEMENT_ARRAY_BUFFER, vertex_idx_buffer);
    gl_context.drawArrays(gl_context.TRIANGLE_STRIP, 0, 4);
  }

  var initTexture = function initTextures() {
    plot_texture = gl_context.createTexture();

    gl_context.bindTexture(gl_context.TEXTURE_2D, plot_texture);
    gl_context.texImage2D(gl_context.TEXTURE_2D, 0, gl_context.RGB, 128, 256, 0, gl_context.RGB, gl_context.UNSIGNED_BYTE, new Uint8Array(spec_data));
    gl_context.texParameteri(gl_context.TEXTURE_2D, gl_context.TEXTURE_MAG_FILTER, gl_context.LINEAR);
    gl_context.texParameteri(gl_context.TEXTURE_2D, gl_context.TEXTURE_MIN_FILTER, gl_context.LINEAR_MIPMAP_NEAREST);
    gl_context.generateMipmap(gl_context.TEXTURE_2D);
    gl_context.bindTexture(gl_context.TEXTURE_2D, null);
  }

  /**
   * @brief Append one or several lines to the spectrum.
   *        This method adds data to the array and removes the oldest part of the array of the corresponding size.
   *        GPU texture is not updated by this method. Call updateRender() to upload changes and render new frame.
   * 
   * @param lines_data Array of the data to be added to the spectrogram. Size of the array must be a multiple of the 
   *        texture vertical resolution times three (for three color channels)
   */
  this.appendLines = function appendLines(lines_data) {
    if (lines_data.length % 128*3 != 0) {
      console.error("SpectroW: Tried to append data array of invalid size. Make sure array size is a multiple of the vertical texture resolution times three.");
      return;
    }
    spec_data = spec_data.slice(0, 256*128*3-lines_data.length);
    spec_data = lines_data.concat(spec_data);
  }

  /**
   * @brief Render frame.
   *        Spectrogram texture is updated and rendered. 
   */
  this.updateRender = function updateRender() {
    gl_context.bindTexture(gl_context.TEXTURE_2D, plot_texture);
    gl_context.texSubImage2D(gl_context.TEXTURE_2D, 0, 0, 0, 128, 256, gl_context.RGB, gl_context.UNSIGNED_BYTE, new Uint8Array(spec_data));
    gl_context.generateMipmap(gl_context.TEXTURE_2D);
    gl_context.bindTexture(gl_context.TEXTURE_2D, null);

    drawScene()
  }

  gl_context = initWebGL(canvas_element);

  if (!gl_context) {
    console.error("SpectroW: Failed to initialize WebGL contenxt.");
    return;
  }

  gl_context.viewport(0, 0, canvas_element.width, canvas_element.height);
  gl_context.clearColor(0.0, 0.4, 0.0, 1.0);
  gl_context.clear(gl_context.COLOR_BUFFER_BIT);

  initShaders();
  initBuffers();
  initTexture();

  drawScene();
}
