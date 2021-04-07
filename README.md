## Matrix 3D Heightmap Chart

Helper that displays a 3D interactive/editable heightmap chart of a 2D Matrix and allows the manual edition of single points

![alt text](https://github.com/freddykrunn/Matrix-3D-Heightmap-Chart/blob/main/assets/matrix-helper-preview.png?raw=true)

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

4. When container element changes its dimensions, you need to call:

```javascript
instance.resize();
```

5. To reset the view:

```javascript
instance.resetView();
```

5. When its not needed anymore:

```javascript
instance.dispose();
```
