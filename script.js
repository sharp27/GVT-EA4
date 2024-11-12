// WebGL-Kontext abrufen
var canvas = document.getElementById('webglCanvas');
var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
var displayModeTorusKnot = "color"; // Anzeigemodus: "color" oder "wireframe" für Torus-Knoten
var displayModeTorus = "color"; // Anzeigemodus: "color" oder "wireframe" für Torus
var displayTorus = true;  // Anzeige des Torus steuern

if (!gl) {
    alert("Ihr Browser unterstützt WebGL nicht");
} else {
    // WebGL-Pipeline einrichten
    gl.clearColor(0.95, 0.95, 0.95, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL); // Verwenden von LEQUAL, um sicherzustellen, dass Drahtgitter korrekt überlagert
    gl.frontFace(gl.CCW);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Vertex-Shader kompilieren (Transformation und Farbverlauf)
    var vsSource = `
        attribute vec3 pos;
        attribute vec4 col;
        varying vec4 color;
        uniform mat4 modelViewMatrix;
        void main() {
            color = col;
            gl_Position = modelViewMatrix * vec4(pos, 1.0);
        }
    `;
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("Fehler im Vertex-Shader:", gl.getShaderInfoLog(vs));
    }

    // Fragment-Shader kompilieren
    var fsSource = `
        precision mediump float;
        varying vec4 color;
        void main() {
            gl_FragColor = color;
        }
    `;
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("Fehler im Fragment-Shader:", gl.getShaderInfoLog(fs));
    }

    // Shader-Programm verlinken
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "pos");
    gl.bindAttribLocation(prog, 1, "col");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Fehler beim Verlinken des Shader-Programms:", gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    // Rotationsmatrix für Drehung um die X-Achse definieren
    var angle = 0 * Math.PI / 180;
    var cosA = Math.cos(angle);
    var sinA = Math.sin(angle);
    var rotationMatrixX = new Float32Array([
        1.0,  0.0,   0.0,  0.0,
        0.0, cosA, -sinA,  0.0,
        0.0, sinA,  cosA,  0.0,
        0.0,  0.0,   0.0,  1.0
    ]);

    // Skalierungs- und Translationsmatrix definieren
    var scaleAndTranslateMatrix = new Float32Array([
        0.0075, 0.0,    0.0,    0.0,
        0.0,    0.0075, 0.0,    0.0,
        0.0,    0.0,    0.0075, 0.0,
        0.0,    0.0,   -0.3,    1.0
    ]);

    // Matrizenmultiplikation implementieren
    function multiplyMatrices(a, b) {
        var result = new Float32Array(16);
        for (var row = 0; row < 4; row++) {
            for (var col = 0; col < 4; col++) {
                result[row * 4 + col] =
                    a[row * 4 + 0] * b[col + 0] +
                    a[row * 4 + 1] * b[col + 4] +
                    a[row * 4 + 2] * b[col + 8] +
                    a[row * 4 + 3] * b[col + 12];
            }
        }
        return result;
    }

    // Model-View-Matrix berechnen und übertragen
    var modelViewMatrix = multiplyMatrices(scaleAndTranslateMatrix, rotationMatrixX);
    var modelViewMatrixLocation = gl.getUniformLocation(prog, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);

    // Puffer und Daten für den Torus-Knoten und Torus initialisieren
    var vertices, colors, indicesLines, indicesTris;
    var torusVertices, torusColors, torusIndicesLines, torusIndicesTris;
    createVertexDataTorusKnot();
    createVertexDataTorus();

    // Positionspuffer für den Torus-Knoten festlegen
    var vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    var posAttrib = gl.getAttribLocation(prog, 'pos');
    gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttrib);

    // Farb-Puffer für den Torus-Knoten festlegen
    var vboCol = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    var colAttrib = gl.getAttribLocation(prog, 'col');
    gl.vertexAttribPointer(colAttrib, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colAttrib);

    // Dreiecks- und Linienpuffer für den Torus-Knoten erstellen
    var iboTris = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTris);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesTris, gl.STATIC_DRAW);
    iboTris.numberOfElements = indicesTris.length;

    var iboLines = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLines);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesLines, gl.STATIC_DRAW);
    iboLines.numberOfElements = indicesLines.length;

    // Positions-, Farb-, Dreiecks- und Linienpuffer für Torus initialisieren
    var vboPosTorus = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPosTorus);
    gl.bufferData(gl.ARRAY_BUFFER, torusVertices, gl.STATIC_DRAW);
    
    var vboColTorus = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboColTorus);
    gl.bufferData(gl.ARRAY_BUFFER, torusColors, gl.STATIC_DRAW);
    
    var iboTrisTorus = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTrisTorus);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, torusIndicesTris, gl.STATIC_DRAW);
    iboTrisTorus.numberOfElements = torusIndicesTris.length;

    var iboLinesTorus = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLinesTorus);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, torusIndicesLines, gl.STATIC_DRAW);
    iboLinesTorus.numberOfElements = torusIndicesLines.length;

    // Szene zeichnen
    drawScene();

    function drawScene() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Torus zeichnen, wenn aktiviert
        if (displayTorus) {
            // Position und Farbe für Torus setzen
            gl.bindBuffer(gl.ARRAY_BUFFER, vboPosTorus);
            gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(posAttrib);

            gl.bindBuffer(gl.ARRAY_BUFFER, vboColTorus);
            gl.vertexAttribPointer(colAttrib, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(colAttrib);

            // Farbmodus oder Drahtgitter für Torus
            if (displayModeTorus === "color") {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTrisTorus);
                gl.drawElements(gl.TRIANGLES, iboTrisTorus.numberOfElements, gl.UNSIGNED_SHORT, 0);
            }

            if (displayModeTorus === "wireframe" || displayModeTorus === "color") {
                gl.lineWidth(1.5);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLinesTorus);
                gl.drawElements(gl.LINES, iboLinesTorus.numberOfElements, gl.UNSIGNED_SHORT, 0);
            }
        }

        // Torus-Knoten zeichnen
        if (displayModeTorusKnot === "color") {
            gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
            gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(posAttrib);

            gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
            gl.vertexAttribPointer(colAttrib, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(colAttrib);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTris);
            gl.drawElements(gl.TRIANGLES, iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
        }

        // Drahtgitter-Overlay für Torus-Knoten
        gl.lineWidth(1.5);
        gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
        gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posAttrib);

        gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
        gl.vertexAttribPointer(colAttrib, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colAttrib);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLines);
        gl.drawElements(gl.LINES, iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
    }

    // Vertex-Daten für Torus und Torus-Knoten generieren
    function createVertexDataTorus() {
        var majorSegments = 64;
        var minorSegments = 32;
        var majorRadius = 100;
        var minorRadius = 10;

        torusVertices = [];
        torusColors = [];
        torusIndicesLines = [];
        torusIndicesTris = [];

        for (var i = 0; i <= majorSegments; i++) {
            var theta = (i / majorSegments) * 2 * Math.PI;
            var cosTheta = Math.cos(theta);
            var sinTheta = Math.sin(theta);

            for (var j = 0; j <= minorSegments; j++) {
                var phi = (j / minorSegments) * 2 * Math.PI;
                var cosPhi = Math.cos(phi);
                var sinPhi = Math.sin(phi);

                var x = (majorRadius + minorRadius * cosPhi) * cosTheta;
                var y = (majorRadius + minorRadius * cosPhi) * sinTheta;
                var z = minorRadius * sinPhi;
                torusVertices.push(x, y, z);

                var nx = cosPhi * cosTheta;
                var ny = cosPhi * sinTheta;
                var nz = sinPhi;

                var brightness = 1.1 + 0.4 * nz;
                brightness = Math.min(brightness, 1.0);
                torusColors.push(brightness, brightness * 0.9, brightness * 0.1, 1.0);

                if (i < majorSegments && j < minorSegments) {
                    var a = i * (minorSegments + 1) + j;
                    var b = a + minorSegments + 1;
                    torusIndicesLines.push(a, a + 1);
                    torusIndicesLines.push(a, b);
                    torusIndicesTris.push(a, a + 1, b);
                    torusIndicesTris.push(a + 1, b + 1, b);
                }
            }
        }

        torusVertices = new Float32Array(torusVertices);
        torusColors = new Float32Array(torusColors);
        torusIndicesLines = new Uint16Array(torusIndicesLines);
        torusIndicesTris = new Uint16Array(torusIndicesTris);
    }

    function createVertexDataTorusKnot() {
        var tubeSegments = 12;
        var knotSegments = 512;
        var R = 100;
        var r = 25;
        var p = 7;
        var q = 3;
        var tubeRadius = 7; 

        vertices = [];
        colors = [];
        indicesLines = [];
        indicesTris = [];

        for (var i = 0; i <= knotSegments; i++) {
            var t = (i / knotSegments) * 2 * Math.PI;
            var centerX = (R + r * Math.cos(p * t)) * Math.cos(q * t);
            var centerY = (R + r * Math.cos(p * t)) * Math.sin(q * t);
            var centerZ = r * Math.sin(p * t);

            for (var j = 0; j <= tubeSegments; j++) {
                var phi = (j / tubeSegments) * 2 * Math.PI;
                var cosPhi = Math.cos(phi);
                var sinPhi = Math.sin(phi);

                var x = centerX + tubeRadius * cosPhi * Math.cos(q * t);
                var y = centerY + tubeRadius * cosPhi * Math.sin(q * t);
                var z = centerZ + tubeRadius * sinPhi;
                vertices.push(x, y, z);

                var nx = cosPhi * Math.cos(q * t);
                var ny = cosPhi * Math.sin(q * t);
                var nz = sinPhi;

                var brightness = 0.9 + 0.4 * nz;
                brightness = Math.min(brightness, 1.0);
                colors.push(brightness, brightness * 0.4, brightness * 0.9, 1.0);

                if (i < knotSegments && j < tubeSegments) {
                    var a = i * (tubeSegments + 1) + j;
                    var b = a + tubeSegments + 1;
                    indicesLines.push(a, a + 1);
                    indicesLines.push(a, b);
                    indicesTris.push(a, a + 1, b);
                    indicesTris.push(a + 1, b + 1, b);
                }
            }
        }

        vertices = new Float32Array(vertices);
        colors = new Float32Array(colors);
        indicesLines = new Uint16Array(indicesLines);
        indicesTris = new Uint16Array(indicesTris);
    }

}

// Anzeigemodus für Torus-Knoten zwischen "color" und "wireframe" wechseln
function toggleDisplayModeTorusKnot() {
    displayModeTorusKnot = displayModeTorusKnot === "color" ? "wireframe" : "color";
    drawScene();
}

// Anzeigemodus für Torus zwischen "color" und "wireframe" wechseln
function toggleDisplayModeTorus() {
    displayModeTorus = displayModeTorus === "color" ? "wireframe" : "color";
    drawScene();
}




// Variablen für das Spiral-Drop-Canvas
var dropCanvas = document.getElementById('spiralDropCanvas');
var dropGl = dropCanvas.getContext('webgl') || dropCanvas.getContext('experimental-webgl');
var displayModeDrop = "color"; // Anzeigemodi: "color" oder "wireframe" für Spiral Drop

if (!dropGl) {
    alert("Ihr Browser unterstützt WebGL für das Spiral-Drop-Canvas nicht");
} else {
    // WebGL-Kontext für Spiral Drop einrichten
    dropGl.clearColor(0.95, 0.95, 0.95, 1.0);
    dropGl.enable(dropGl.DEPTH_TEST);
    dropGl.depthFunc(dropGl.LEQUAL);
    dropGl.frontFace(dropGl.CCW);
    dropGl.enable(dropGl.CULL_FACE);
    dropGl.cullFace(dropGl.BACK);

    // Vertex-Shader für Spiral Drop kompilieren
    var dropVsSource = `
        attribute vec3 pos;
        attribute vec4 col;
        varying vec4 color;
        uniform mat4 dropModelViewMatrix;
        void main() {
            color = col;
            gl_Position = dropModelViewMatrix * vec4(pos, 1.0);
        }
    `;
    var dropVs = dropGl.createShader(dropGl.VERTEX_SHADER);
    dropGl.shaderSource(dropVs, dropVsSource);
    dropGl.compileShader(dropVs);
    if (!dropGl.getShaderParameter(dropVs, dropGl.COMPILE_STATUS)) {
        console.error("Fehler im Vertex-Shader (Drop):", dropGl.getShaderInfoLog(dropVs));
    }

    // Fragment-Shader für Spiral Drop kompilieren
    var dropFsSource = `
        precision mediump float;
        varying vec4 color;
        void main() {
            gl_FragColor = color;
        }
    `;
    var dropFs = dropGl.createShader(dropGl.FRAGMENT_SHADER);
    dropGl.shaderSource(dropFs, dropFsSource);
    dropGl.compileShader(dropFs);
    if (!dropGl.getShaderParameter(dropFs, dropGl.COMPILE_STATUS)) {
        console.error("Fehler im Fragment-Shader (Drop):", dropGl.getShaderInfoLog(dropFs));
    }

    // Shader-Programm für Spiral Drop verlinken
    var dropProg = dropGl.createProgram();
    dropGl.attachShader(dropProg, dropVs);
    dropGl.attachShader(dropProg, dropFs);
    dropGl.bindAttribLocation(dropProg, 0, "pos");
    dropGl.bindAttribLocation(dropProg, 1, "col");
    dropGl.linkProgram(dropProg);
    if (!dropGl.getProgramParameter(dropProg, dropGl.LINK_STATUS)) {
        console.error("Fehler beim Verlinken des Shader-Programms (Drop):", dropGl.getProgramInfoLog(dropProg));
    }
    dropGl.useProgram(dropProg);

    // Rotationsmatrix für Spiral Drop um die X-Achse definieren
    var angleX = 90 * Math.PI / 180;  
    var cosX = Math.cos(angleX);
    var sinX = Math.sin(angleX);

    var rotationMatrixX = new Float32Array([
        1.0,  0.0,   0.0,  0.0,
        0.0, cosX, -sinX,  0.0,
        0.0, sinX,  cosX,  0.0,
        0.0,  0.0,   0.0,  1.0
    ]);

    var dropScaleAndTranslateMatrix = new Float32Array([
        1.0, 0.0,   0.0,    0.0,
        0.0,   1.0, 0.0,    0.0,
        0.0,   0.0,   1.0,  0.0,
        0.0,   0.0,  0.0,    1.1
    ]);

    // Transformationen kombinieren: Skalieren, Verschieben, dann Rotieren
    function multiplyMatricesDrop(a, b) {
        var result = new Float32Array(16);
        for (var row = 0; row < 4; row++) {
            for (var col = 0; col < 4; col++) {
                result[row * 4 + col] =
                    a[row * 4 + 0] * b[col + 0] +
                    a[row * 4 + 1] * b[col + 4] +
                    a[row * 4 + 2] * b[col + 8] +
                    a[row * 4 + 3] * b[col + 12];
            }
        }
        return result;
    }

    // Model-View-Matrix berechnen und an den Shader übergeben
    var dropModelViewMatrix = multiplyMatricesDrop(rotationMatrixX, dropScaleAndTranslateMatrix);
    var dropModelViewMatrixLocation = dropGl.getUniformLocation(dropProg, "dropModelViewMatrix");
    dropGl.uniformMatrix4fv(dropModelViewMatrixLocation, false, dropModelViewMatrix);

    // Datenpuffer für Spiral Drop initialisieren
    var dropVertices, dropColors, dropIndicesLines, dropIndicesTris;
    createVertexDataSpiralDrop();

    var dropVboPos = dropGl.createBuffer();
    dropGl.bindBuffer(dropGl.ARRAY_BUFFER, dropVboPos);
    dropGl.bufferData(dropGl.ARRAY_BUFFER, dropVertices, dropGl.STATIC_DRAW);
    var dropPosAttrib = dropGl.getAttribLocation(dropProg, 'pos');
    dropGl.vertexAttribPointer(dropPosAttrib, 3, dropGl.FLOAT, false, 0, 0);
    dropGl.enableVertexAttribArray(dropPosAttrib);

    var dropVboCol = dropGl.createBuffer();
    dropGl.bindBuffer(dropGl.ARRAY_BUFFER, dropVboCol);
    dropGl.bufferData(dropGl.ARRAY_BUFFER, dropColors, dropGl.STATIC_DRAW);
    var dropColAttrib = dropGl.getAttribLocation(dropProg, 'col');
    dropGl.vertexAttribPointer(dropColAttrib, 4, dropGl.FLOAT, false, 0, 0);
    dropGl.enableVertexAttribArray(dropColAttrib);

    var dropIboTris = dropGl.createBuffer();
    dropGl.bindBuffer(dropGl.ELEMENT_ARRAY_BUFFER, dropIboTris);
    dropGl.bufferData(dropGl.ELEMENT_ARRAY_BUFFER, dropIndicesTris, dropGl.STATIC_DRAW);
    dropIboTris.numberOfElements = dropIndicesTris.length;

    var dropIboLines = dropGl.createBuffer();
    dropGl.bindBuffer(dropGl.ELEMENT_ARRAY_BUFFER, dropIboLines);
    dropGl.bufferData(dropGl.ELEMENT_ARRAY_BUFFER, dropIndicesLines, dropGl.STATIC_DRAW);
    dropIboLines.numberOfElements = dropIndicesLines.length;

    // Szene für Spiral Drop zeichnen
    drawDropScene();

    function drawDropScene() {
        dropGl.clear(dropGl.COLOR_BUFFER_BIT | dropGl.DEPTH_BUFFER_BIT);

        if (displayModeDrop === "color") {
            // Gefüllte Dreiecke für Farbmodus zeichnen
            dropGl.bindBuffer(dropGl.ELEMENT_ARRAY_BUFFER, dropIboTris);
            dropGl.drawElements(dropGl.TRIANGLES, dropIboTris.numberOfElements, dropGl.UNSIGNED_SHORT, 0);
        }

        // Drahtgitterlinien immer zeichnen (im Farbmodus werden sowohl Dreiecke als auch Linien gezeichnet)
        dropGl.lineWidth(1.5);
        dropGl.bindBuffer(dropGl.ELEMENT_ARRAY_BUFFER, dropIboLines);
        dropGl.drawElements(dropGl.LINES, dropIboLines.numberOfElements, dropGl.UNSIGNED_SHORT, 0);
    }

    // Vertex-Daten für Spiral Drop erstellen
    function createVertexDataSpiralDrop() {
        var tubeSegmentsDrop = 64;   
        var spiralSegments = 64;    
        var a = 0.5;                
        var b = 1.1;                
        var p = 1;                   

        dropVertices = [];
        dropColors = [];
        dropIndicesLines = [];
        dropIndicesTris = [];

        for (var i = 0; i <= spiralSegments; i++) {
            var u = (i / spiralSegments) * Math.PI; 

            for (var j = 0; j <= tubeSegmentsDrop; j++) {
                var v = (j / tubeSegmentsDrop) * 2 * Math.PI;

                var x = a * (b - Math.cos(u)) * Math.sin(u) * Math.cos(v + p * u);
                var y = a * (b - Math.cos(u)) * Math.sin(u) * Math.sin(v + p * u);
                var z = Math.cos(u);

                dropVertices.push(x, y, z);

                var brightness = 0.7 + 0.4 * Math.sin(v); 
                dropColors.push(brightness, brightness * 0.4, brightness * 0.9, 1.0);

                if (i < spiralSegments && j < tubeSegmentsDrop) {
                    var current = i * (tubeSegmentsDrop + 1) + j;
                    var next = current + tubeSegmentsDrop + 1;

                    dropIndicesLines.push(current, current + 1);
                    dropIndicesLines.push(current, next);

                    dropIndicesTris.push(current, current + 1, next);
                    dropIndicesTris.push(current + 1, next + 1, next);
                }
            }
        }

        dropVertices = new Float32Array(dropVertices);
        dropColors = new Float32Array(dropColors);
        dropIndicesLines = new Uint16Array(dropIndicesLines);
        dropIndicesTris = new Uint16Array(dropIndicesTris);
    }
}

// Anzeigemodus zwischen "color" und "wireframe" für Spiral Drop wechseln
function toggleDisplayModeDrop() {
    displayModeDrop = displayModeDrop === "color" ? "wireframe" : "color";
    drawDropScene();
}