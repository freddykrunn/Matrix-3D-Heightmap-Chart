/**
 * @author Frederico Gonçalves (https://github.com/freddykrunn/)
 * @license MIT
 * 3D Matrix Height Map helper
 * x - represents the columns
 * y - represents the rows
 * 
 *    X ->
 * Y [ ][ ][ ][ ]
 * | [ ][ ][ ][ ]
 * v [ ][ ][ ][ ]
 *   [ ][ ][ ][ ]
 * 
 * @param {object} params the params for the initialization
 * {
 *  container: string | HTMLElement // container of the matrix display
 *  min: number // min value of each matrix slot 
 *  max: number, // max value of each matrix slot 
 *  axis: {
 *     x: string[], // the x axis definition (array of column names)
 *     y: string[] // the y axis definition (array of rows names)
 *  },
 *  data: number[][], // initial data to feed the matrix (if not provided the matrix will be initialized with '0' in every cell)
 *  onChange: function(x, y, value, data) // when any value is changed in the Matrix 
 * }
 */
function MatrixHeightMap(params) {
    this.CAMERA_DEFAULT_DISTANCE = 2,
    this.FOV = 35,
    this.NEAR = 0.001,
    this.FAR = 100,
    this.MATRIX_SIZE = 2;
    this.PIVOT_COORDINATE_X = "__pivot_x",
    this.PIVOT_COORDINATE_Y = "__pivot_y",
    this.PIVOT_SELECTION_OBJECT = "__pivot_selection",

    this.minZ = params.min;
    this.maxZ = params.max;

    if (params.axis) {
        this.XAxisNames = new Array(...params.axis.x);
        this.YAxisNames = new Array(...params.axis.y);
    } else {
        this.XAxisNames = ["A", "B", "C", "D", "E"],
        this.YAxisNames = ["1", "2", "3", "4", "5"]
    }

    this.mX = this.XAxisNames.length;
    this.mY = this.YAxisNames.length;
    
    this.canvasContainer = typeof(params.container) === "string" ? document.querySelector(params.container) : params.container;

    this.matrix = null;
    this.object = null;
    this.objectGeometry = null;
    this.vertexPivotsSelection = null;
    this.vertexPivots = null;
    this.vertexPivotsObject = null;
    this.activePivotX = null;
    this.activePivotY = null;
    this.highlightedPivot = null;
    this.chartSizeX = null;
    this.chartSizeY = null;
    this.chartSizeXHalf = null;
    this.chartSizeYHalf = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.lastMouse = new THREE.Vector2();
    this.mouseDown = false;
    this.cellSelected = false;
    this.movePivotEnabled = false;

    // init camera
    this.camera = new THREE.PerspectiveCamera( this.FOV, this.canvasContainer.offsetWidth / this.canvasContainer.offsetHeight, this.NEAR, this.FAR );
    this.camera.position.set(this.CAMERA_DEFAULT_DISTANCE, this.CAMERA_DEFAULT_DISTANCE, this.CAMERA_DEFAULT_DISTANCE);
    this.camera.lookAt( new THREE.Vector3(0,0,0) );

    // init camera controls
    this.cameraControls = new THREE.OrbitControls(this.camera, this.canvasContainer);
    this.cameraControls.enableRotate = true;
    this.cameraControls.enablePan = false;
    this.cameraControls.enableZoom = true;

    // init scene
    this.scene = new THREE.Scene();

    // init matrix
    this.setData(params.data);

    // init renderer
    this.renderer = new THREE.WebGLRenderer( { antialias: true} );
    this.renderer.setClearColor(0xAAAAAA);
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( this.canvasContainer.offsetWidth, this.canvasContainer.offsetHeight );
    this.canvasContainer.appendChild( this.renderer.domElement );

    this.onMatrixDataChange = params.onChange;

    // key/mouse events
    this._onMouseMove = this._onMouseMoveEvent.bind(this);
    this._onMouseDown = this._onMouseDownEvent.bind(this);
    this._onMouseUp = this._onMouseUpEvent.bind(this);
    this._onKeyDown = this._onKeyDownEvent.bind(this);
    this._onKeyUp = this._onKeyUpEvent.bind(this);
    window.addEventListener( 'mousemove', this._onMouseMove, false );
    window.addEventListener( 'mousedown', this._onMouseDown, false );
    window.addEventListener( 'mouseup', this._onMouseUp, false );
    window.addEventListener( 'keydown', this._onKeyDown, false );
    window.addEventListener( 'keyup', this._onKeyUp, false );

    // start animation
    this.animateFunction = this._animate.bind(this)
    this.animateFunction();
}

MatrixHeightMap.prototype = {

    //#region utils

    /**
     * Get coordinates from index
     */
    _getCoordinatesFromIndex: function(index) {
        return {
            y: Math.floor(index / this.mX),
            x: index % this.mX
        }
    },

    /**
     * Get index from coordinates
     */
    _getIndexFromCoordinates: function(x, y) {
        return (y * this.mX) + x
    },

    /**
     * Convert value for matrix
     */
    _convertValueForMatrix: function(value) {
        return (value * (this.maxZ - this.minZ)) + this.minZ;
    },

    /**
     * Convert value from matrix
     */
    _convertValueFromMatrix: function(value) {
        return (value - this.minZ) / (this.maxZ - this.minZ);
    },

    /**
     * Set matrix value color
     */
    _setMatrixValueColor: function(x, y) {
        if (this.matrix[y] != null && this.matrix[y][x] != null) {
            this.matrix[y][x].color = `hsl(${128 - (this.matrix[y][x].value * 128)}, 100%, 50%)`;
            this.matrix[y][x].fadedColor = `hsl(${128 - (this.matrix[y][x].value * 128)}, 75%, 75%)`;
        }
    },

    //#endregion

    //#region Matrix

    /**
     * Init matrix
     */
    _initMatrix: function(initialData) {
        // init matrix
        this.matrix = new Array(this.mY);
        for (var y = 0; y < this.mY; y++) {
            this.matrix[y] = new Array(this.mX);
            for (var x = 0; x < this.mX; x++) {
                this.matrix[y][x] = {
                    value: initialData != null && initialData[y] != null && initialData[y][x] != null ? this._convertValueFromMatrix(initialData[y][x]) : 0,
                    color: `hsl(0, 100%, 50%)`
                }

                if (this.matrix[y][x].value < 0) {
                    this.matrix[y][x].value = 0;
                }
                if (this.matrix[y][x].value > 1) {
                    this.matrix[y][x].value = 1;
                }

                this._setMatrixValueColor(x, y);
            }
        }
    },

    /**
     * Set Matrix value
     */
    _setValue: function(x, y, value) {
        var cell = this.matrix[y][x];
        cell.value = value;

        if (cell.value < 0) {
            cell.value = 0;
        }
        if (cell.value > 1) {
            cell.value = 1;
        }

        this._setMatrixValueColor(x, y);

        if (this.vertexPivots) {
            this.vertexPivots[y][x].position.y = cell.value;
            this.vertexPivots[y][x][this.PIVOT_SELECTION_OBJECT].position.y = cell.value;
        }

        if (this.object && this.object.children && this.object.children.length > 0) {
            this.object.children[0].geometry.vertices[this._getIndexFromCoordinates(x, y)].z = cell.value;
            this.object.children[0].geometry.verticesNeedUpdate = true;
        }

        if (this.onMatrixDataChange) {
            try {
                var data = [];
                var row;
                for (var y = 0; y < this.mY; y++) {
                    row = new Array(this.mX)
                    for (var x = 0; x < this.mX; x++) {
                        row[x] = Math.round(this._convertValueForMatrix(this.matrix[y][x].value) * 100000) / 100000;
                    }
                    data.push(row);
                }
                this.onMatrixDataChange(x, y, Math.round(this._convertValueForMatrix(value) * 100000) / 100000, data);
            } catch(ex) {
            }
        }
    },

    //#endregion

    //#region Chart

    /**
     * Compute grid lines
     */
    _computeGridLines: function() {
        if (this.gridLines != null) {
            this.scene.remove(this.gridLines);
        }

        this.gridLines = new THREE.Object3D();
        this.gridLines.add(this._makeZGridLine());
        this.gridLines.add(this._makeYGridLine());
        this.gridLines.add(this._makeXGridLine());
        this.scene.add(this.gridLines);
    },

    /**
     * Compute Chart
     */
    _computeChart: function() {
        if (this.object) {
            this.scene.remove(this.object);
        }
        if (this.vertexPivotsObject != null) {
            this.scene.remove(this.vertexPivotsObject);
        }
        if (this.highlightedPivot != null) {
            this.scene.remove(this.highlightedPivot);
        }

        var xIncrement = this.chartSizeX / (this.mX - 1);
        var yIncrement = this.chartSizeY / (this.mY - 1);

        // create chart geometry
        this.objectGeometry = new THREE.PlaneGeometry(this.chartSizeX, this.chartSizeY, this.mX - 1, this.mY - 1);
        var index;
        for (var y = 0; y < this.mY; y++) {
            for (var x = 0; x < this.mX; x++) {
                index = this._getIndexFromCoordinates(x, y);
                this.objectGeometry.vertices[index].z = this.matrix[y][x].value;
            }
        }

        this._updateVertexColors();

        // create vertex points
        this.vertexPivotsObject = new THREE.Object3D();
        this.vertexPivotsSelection = [];
        var geometry, material, selectionObject;
        this.vertexPivots = new Array(this.mY);
        for (var y = 0; y < this.mY; y++) {
            this.vertexPivots[y] = new Array(this.mX);
            for (var x = 0; x < this.mX; x++) {
                geometry = new THREE.BoxGeometry(this.chartSizeX / 100, this.chartSizeX / 100, this.chartSizeX / 100);
                material = new THREE.MeshBasicMaterial({color: 0x0000FF, transparent: true, depthTest: false, opacity: 0});

                this.vertexPivots[y][x] = new THREE.Mesh(geometry, material);
                this.vertexPivots[y][x].position.z = (yIncrement * y) - this.chartSizeYHalf;
                this.vertexPivots[y][x].position.y = this.matrix[y][x].value
                this.vertexPivots[y][x].position.x = (xIncrement * x) - this.chartSizeXHalf;

                geometry = new THREE.SphereGeometry(this.chartSizeX / 50, 4, 4);
                material = new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, depthTest: false, opacity: 0});
                selectionObject = new THREE.Mesh(geometry, material);
                selectionObject[this.PIVOT_COORDINATE_Y] = y;
                selectionObject[this.PIVOT_COORDINATE_X] = x;
                selectionObject.position.set(this.vertexPivots[y][x].position.x, this.vertexPivots[y][x].position.y, this.vertexPivots[y][x].position.z);
                this.vertexPivotsSelection.push(selectionObject);
                this.vertexPivots[y][x][this.PIVOT_SELECTION_OBJECT] = selectionObject;

                this.vertexPivotsObject.add(this.vertexPivots[y][x]);
                this.vertexPivotsObject.add(selectionObject);
            }
        }

        // create highlight pivot
        var hpGeo = new THREE.BoxGeometry(this.chartSizeX / 50, this.chartSizeX / 50, this.chartSizeX / 50);
        var hpMat = new THREE.MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: 0});
        this.highlightedPivot = new THREE.Mesh(hpGeo, hpMat);

        // create mesh
        var wireframeObject = new THREE.Mesh(this.objectGeometry, new THREE.MeshBasicMaterial({color: 0x000000, wireframe: true}));
        var colorObject = new THREE.Mesh(this.objectGeometry, new THREE.MeshBasicMaterial({vertexColors: true}));

        this.object = new THREE.Object3D();
        this.object.add(wireframeObject);
        this.object.add(colorObject);
        this.object.rotation.x = -Math.PI * 0.5;

        this._computeGridLines();

        this.scene.add(this.object);
        this.scene.add(this.vertexPivotsObject);
        this.scene.add(this.highlightedPivot);
    },

    /**
     * Make z grid line 
     */
    _makeZGridLine: function() {
        var min = this.minZ;
        var max = this.maxZ;
        var resolution = 10;
        var count = max;
        var increment = Math.round((max - min) / resolution);

        var axisValues = [];
        for (var i = 0; i <= resolution; i++) {
            axisValues.push(count);
            count -= increment;
        }

        var size = this.chartSizeX / 10;

        return this._makeGridLine(axisValues,
            64,
            size,
            1,
            new THREE.Vector3(-this.chartSizeXHalf - size, 0.5, -this.chartSizeYHalf),
            new THREE.Vector3(0, 0, 0));
    },

    /**
     * Make y grid line 
     */
    _makeYGridLine: function() {
        var size = this.chartSizeX / 10;
        return this._makeGridLine(this.YAxisNames,
            56,
            size,
            this.chartSizeX,
            new THREE.Vector3(-this.chartSizeXHalf - (size * 0.5), 0, 0),
            new THREE.Vector3(-Math.PI * 0.5, 0, 0));
    },

    /**
     * Make x grid line 
     */
    _makeXGridLine: function() {
        var size = this.chartSizeY / 10;
        return this._makeGridLine(new Array(...this.XAxisNames).reverse(),
            56,
            size,
            this.chartSizeY,
            new THREE.Vector3(0, 0, -this.chartSizeYHalf - (size * 0.5)),
            new THREE.Vector3(-Math.PI * 0.5, 0, -Math.PI * 0.5),
            true);
    },

    /**
     * Make grid line 
     */
    _makeGridLine: function(axisValues, fontSize, width, height, position, rotation, rotateText) {
        var offset = 50;

        // draw axis
        var canvas = document.createElement('canvas');
        canvas.width = width * 1024;
        canvas.height = height * 1024;
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.font = "Bold " + fontSize + "px consolas";
        if (rotateText) {
            context.textAlign = "center";
        } else {
            context.textAlign = "right";
        }
        context.textBaseline = "middle";
        context.fillStyle   = "black";
        context.strokeStyle = "black";
        context.lineWidth = 4;

        // var offsetIncrement = (canvas.height - 50) / (axisValues.length - 1);
        var offsetIncrement = (canvas.height - offset) / (axisValues.length - 1);
        var x, y;
        for (var i = 0; i < axisValues.length; i++) {
            x = canvas.width - 40;
            y = (i * offsetIncrement) + (offset * 0.5); // (offsetIncrement * 0.25) + 
            
            context.save();
            if (rotateText) {
                context.translate(x - 20, y);
                context.rotate(-Math.PI * 0.5);
            } else {
                context.translate(x, y);
            }
            context.fillText(axisValues[i], 0, 0);
            context.restore();

            context.beginPath();
            context.moveTo(x + 30, y);
            context.lineTo(x + 10, y);
            context.stroke();
        }

        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(canvas.width - 20, 0);
        context.lineTo(canvas.width - 20, canvas.height);
        context.stroke();
        
        // canvas contents will be used for a texture
        var texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        // create axis plane
        var geometry = new THREE.PlaneGeometry(width, height * 1.025, 1, 1);
        var material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide,  });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = position.x;
        mesh.position.y = position.y;
        mesh.position.z = position.z;

        mesh.rotation.x = rotation.x;
        mesh.rotation.y = rotation.y;
        mesh.rotation.z = rotation.z;

        return mesh;
    },

    /**
     * Update vertex colors of chart
     */
    _updateVertexColors: function() {
        var coords;
        for (const face of this.objectGeometry.faces) {
            face.vertexColors = [];
            coords = this._getCoordinatesFromIndex(face.a);
            face.vertexColors.push(new THREE.Color(this.matrix[coords.y][coords.x].color));

            coords = this._getCoordinatesFromIndex(face.b);
            face.vertexColors.push(new THREE.Color(this.matrix[coords.y][coords.x].color));

            coords = this._getCoordinatesFromIndex(face.c);
            face.vertexColors.push(new THREE.Color(this.matrix[coords.y][coords.x].color));
        }
        this.objectGeometry.colorsNeedUpdate = true;
        this.objectGeometry.elementsNeedUpdate = true;
    },

    /**
     * Highlight vertex
     */
    _highlightVertex: function() {
        if (this.tableSelectedCells != null && this.tableSelectedCells.length > 0) {
            this.highlightedPivot.position.x = ((this.tableSelectedCells[0][1] / (MATRIX_X - 1)) * this.chartSizeX) - (this.chartSizeX * 0.5);
            this.highlightedPivot.position.z = ((this.tableSelectedCells[0][0] / (MATRIX_Y - 1)) * this.chartSizeY) - (this.chartSizeY * 0.5);
            this.highlightedPivot.position.y = this.vertexPivots[this.tableSelectedCells[0][0]][this.tableSelectedCells[0][1]].position.y;
            this.highlightedPivot.material.opacity = 0.75;
        } else {
            this.highlightedPivot.material.opacity = 0;
            this.highlightedPivot.position.x = 0;
            this.highlightedPivot.position.z = 0;
        }
    },

    //#endregion

    //#region API

    /**
     * Set matrix data
     * @param {number[][]} matrixData the matrix data (number of columns and rows must correspond to initial defined matrix dimensions)
     */
    setData(matrixData) {
        // init matrix
        this._initMatrix(matrixData);
        // compute chart
        this.chartSizeX = this.MATRIX_SIZE;
        this.chartSizeY = this.MATRIX_SIZE;
        this.chartSizeXHalf = this.chartSizeX * 0.5;
        this.chartSizeYHalf = this.chartSizeY * 0.5;
        this._computeChart();
    },

    /**
     * Set Matrix value
     * @param {number} x the x coordinate of the matrix (horizontal)
     * @param {number} y the y coordinate of the matrix (vertical)
     * @param {number} value the value to set
     */
    setValue: function(x, y, value) {
        this._setValue(x, y, this._convertValueFromMatrix(value));
        this._updateVertexColors();
    },

    /**
     * Reset view
     */
    resetView: function() {
        this.cameraControls.reset();
    },

    /**
     * Resize
     */
    resize: function() {
        var dims = this.canvasContainer.getBoundingClientRect();
        this.camera.aspect = dims.width / dims.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( dims.width, dims.height );
    },

    /**
     * Dispose
     */
    dispose: function() {
        window.removeEventListener( 'mousemove', this._onMouseMove, false );
        window.removeEventListener( 'mousedown', this._onMouseDown, false );
        window.removeEventListener( 'mouseup', this._onMouseUp, false );
        window.removeEventListener( 'keydown', this._onKeyDown, false );
        window.removeEventListener( 'keyup', this._onKeyUp, false );
    },

    //#endregion

    //#region Core

    /**
     * Animate
     */
    _animate: function() {
        // calculate objects intersecting the picking ray
        if (!this.mouseDown && this.vertexPivotsSelection != null && this.vertexPivotsSelection.length > 0) {
            // update the picking ray with the camera and mouse position
            this.raycaster.setFromCamera(this.mouse, this.camera );
        
            var intersects = this.raycaster.intersectObjects( this.vertexPivotsSelection );

            for (const pivot of this.vertexPivotsObject.children) {
                pivot.material.opacity = 0;
            }

            if (intersects != null && intersects.length > 0) {
                this.activePivotX = intersects[0].object[this.PIVOT_COORDINATE_X];
                this.activePivotY = intersects[0].object[this.PIVOT_COORDINATE_Y];
                if (this.activePivotX >= 0 && this.activePivotX < this.mX &&
                    this.activePivotY >= 0 && this.activePivotY < this.mY) {
                        this.vertexPivots[this.activePivotY][this.activePivotX].material.opacity = 1;
                }
            } else {
                this.activePivotX = null;
                this.activePivotY = null;
            }
        }

        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.animateFunction);
    },

    /**
     * Mouse move
     */
     _onMouseMoveEvent: function(event) {
        var dims = this.canvasContainer.getBoundingClientRect();
        this.mouse.x = ( (event.clientX - dims.x) / dims.width ) * 2 - 1;
        this.mouse.y = - ( (event.clientY - dims.y) / dims.height ) * 2 + 1;
        
        if (this.activePivotX != null && this.activePivotY != null && this.activePivotX >= 0 && this.activePivotX < this.mX && this.activePivotY >= 0 && this.activePivotY < this.mY) {
            if (this.mouseDown) {
                this.lastMouse.y = this.lastMouse.y != null ? this.lastMouse.y : event.clientY;
                var movementY = event.clientY - this.lastMouse.y;

                var newValue = this.vertexPivots[this.activePivotY][this.activePivotX].position.y - (movementY * 0.001);
                this._setValue(this.activePivotX, this.activePivotY, newValue);
    
                this.lastMouse.y = event.clientY;

                if (!this.cellSelected) {
                    this.cellSelected = true;
                }
            }
        }
    },

    /**
     * Mouse down
     */
     _onMouseDownEvent: function(event) {
        if (event.button === 0) {
            this.mouseDown = true;
            this.cellSelected = false;
            this.lastMouse.y = event.clientY;
        }
    },

    /**
     * Mouse up 
     */
     _onMouseUpEvent: function(event) {
        this.mouseDown = false;
        if (this.activePivotX != null && this.activePivotY != null) {
            var value = this.matrix[this.activePivotY][this.activePivotX].value;
            if (value != null) {
                value = Math.round(value * 100000) / 100000;
            }
            this._updateVertexColors();
        }
    },

    /**
     * Key down 
     */
     _onKeyDownEvent: function(event) {
        if (event.ctrlKey) {
            this.cameraControls.enableRotate = false;
            this.cameraControls.enablePan = true;
        }
    },

    /**
     * Key up 
     */
     _onKeyUpEvent: function(event) {
        if (!event.ctrlKey) {
            this.cameraControls.enableRotate = true;
            this.cameraControls.enablePan = false;
        }
    }

    //#endregion
}