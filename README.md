## 3D Matrix Height Map

Helper to display a 3D interactive height map of a Matrix

image

## Usage

1. Create an instance

```javascript

// create instance of the MatrixHeightMap
var instance = new MatrixHeightMap({
    container: "#canvasContainer", // element that will contain the display canvas
    min: 0, // min value
    max: 1000, // max value
    axis: {
        x: ["A", "B", "C", "D", "E"], // X axis names (also defines the length of the matrix X dimension)
        y: ["1", "2", "3", "4", "5"] // Y axis names (also defines the length of the matrix Y dimension)
    },
    // on value change callback
    onChange(x, y, value, data) {
        console.log(`(Changed) [${x}, ${y}] = ${value}`);
    }
});

```

2. Set a single value of the Matrix

```javascript
instance.setValue(0, 4, 400); // x = 0, y = 4, value = 400
```

3. Set entire data for the Matrix

```javascript
instance.setData([
        [200, 400, 500, 200, 100],
        [100, 300, 200, 250, 500],
        [300, 600, 150, 100, 200],
        [500, 600, 400, 350, 300],
        [100, 200, 600, 400, 500],
]);
```

4. When main container changes dimensions call:

```javascript
instance.resize();
```

5. To reset the view, call:

```javascript
instance.resetView();
```

5. When its not needed anymore:

```javascript
instance.dispose();
```