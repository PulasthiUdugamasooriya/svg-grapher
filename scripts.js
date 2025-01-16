class Vector {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.magnitude = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
    }

    add(v) {
        return new Vector((this.x + v.x), (this.y + v.y), (this.z + v.z));
    }

    subtract(v) {
        return new Vector((this.x - v.x), (this.y - v.y), (this.z - v.z));
    }

    scale(lambda) {
        return new Vector((this.x * lambda), (this.y * lambda), (this.z * lambda));
    }

    dot(v) {
        return (this.x * v.x) + (this.y * v.y) + (this.z * v.z);
    }

    cross(v) {
        var x = (this.y * v.z) - (v.y * this.z);
        var y = -(this.x * v.z) + (v.x * this.z);
        var z = (this.x * v.y) - (v.x * this.y);
        return new Vector(x, y, z);
    }

    unitVector() {
        return this.scale(1 / this.magnitude);
    }

    static dotProduct(a, b) {
        return a.dot(b);
    }

    static crossProduct(a, b) {
        return a.cross(b);
    }
}

class SVGElement {
    htmlElement;

    constructor(name) {
        this.htmlElement = document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    setProperties(properties) {
        for (var property in properties) {
            this.htmlElement.setAttribute(property, properties[property]);
        }
    }

    setProperty(property, value) {
        this.htmlElement.setAttribute(property, value);
    }
}

class SVGLine extends SVGElement {
    constructor(start, end) {
        var lineElement = super("line");

        lineElement.setProperties({
            "x1" : start.x,
            "y1" : start.y,
            "x2" : end.x,
            "y2" : end.y,
            "stroke" : "black",
            "stroke-width" : 1,
        });

        return lineElement;
    }
}

class SVGText extends SVGElement {
    constructor(text, point, anchor) {
        // look at text wrapping. needs to be set with css.
        var textElement = super("text");

        textElement.setProperties({
            "x" : point.x,
            "y" : point.y,
            "text-anchor" : anchor,
            "font-family" : "Arial",
            "font-size" : 12,
        });

        textElement.htmlElement.innerHTML = text;

        return textElement;
    }
}

class SVGPath extends SVGElement {
    constructor(pathString) {
        var pathElement = super("path");

        pathElement.setProperties({
            "d" : pathString,
            "stroke" : "black",
            "stroke-width" : 1,
            "fill" : "transparent",
        });
        
        return pathElement;
    }
}

class SVGStage extends SVGElement {
    width;
    height;

    constructor(parentElement) {
        super("svg");
        
        this.width = parentElement.clientWidth;
        this.height = parentElement.clientHeight;

        this.setProperties({
            "width" : this.width,
            "height" : this.height,
            "preserveAspectRatio" : "none",
            "viewBox" : "0 0 " + this.width + " " + this.height
        });

        parentElement.appendChild(this.htmlElement);
    }

    addElement(element) {
        this.htmlElement.appendChild(element.htmlElement);
    }

    clear() {
        this.htmlElement.replaceChildren();
    }
}

class PlotSpace extends SVGStage {
    #dx;
    #dy;
    #originX;
    #originY;

    constructor(parentElement, leftmostX, rightmostX, bottommostY, topmostY) {
        super(parentElement);

        this.leftmostX = leftmostX;
        this.rightmostX = rightmostX;
        this.bottommostY = bottommostY;
        this.topmostY = topmostY;

        this.#dx = this.width / (rightmostX - leftmostX);
        this.#dy = this.height / (topmostY - bottommostY);

        this.#originX = -this.#dx * leftmostX;
        this.#originY = this.#dy * topmostY;
    }

    getSVGCoords(point) {
        var svgX = (point.x * this.#dx) + this.#originX;
        var svgY = this.#originY - (point.y * this.#dy);
        return new Vector(svgX, svgY, 0);
    }

    getSVGPathString(userCoordString) {
        var svgPathString = "";

        var entries = userCoordString.split(" ");

        for (var entryIndex = 0; entryIndex < entries.length; entryIndex += 3) {
            var command = entries[entryIndex];
            var x = parseFloat(entries[entryIndex + 1]);
            var y = parseFloat(entries[entryIndex + 2]);

            var svgCoords;

            if (command === command.toLowerCase()) {
                svgCoords = new Vector(x * this.#dx, y * this.#dy, 0);
            } else {
                svgCoords = this.getSVGCoords(new Vector(x, y, 0));
            }

            svgPathString += command + " " + svgCoords.x + " " + svgCoords.y + " ";
        }

        return svgPathString;
    }
}

class Plot2D extends PlotSpace {
    constructor(parentElement, leftmostX, rightmostX, bottommostY, topmostY) {
        super(parentElement, leftmostX, rightmostX, bottommostY, topmostY);
    }

    drawLine(start, end) {
        var startSVG = this.getSVGCoords(start);
        var endSVG = this.getSVGCoords(end);
        var lineElement = new SVGLine(startSVG, endSVG);
        this.addElement(lineElement);
        
        return lineElement;
    }

    drawText(text, point, anchor) {
        var svgPoint = this.getSVGCoords(point);
        var textElement = new SVGText(text, svgPoint, anchor);
        this.addElement(textElement);
        
        return textElement;
    }

    drawPath(pathString) {
        var pathElement = new SVGPath(pathString);
        this.addElement(pathElement);

        return pathElement;
    }

    drawCurve(x, y, startT, endT, numPts) {
        var tIncrement = (endT - startT) / numPts;

        var startPoint = this.getSVGCoords(new Vector(x(startT), y(startT), 0));
        var pathString = "M " + startPoint.x + " " + startPoint.y + " ";

        for (var t = startT + tIncrement; t <= endT; t += tIncrement) {
            var nextPoint = this.getSVGCoords(new Vector(x(t), y(t), 0));
            pathString += "L " + nextPoint.x + " " + nextPoint.y + " ";
        }

        var curveElement = new SVGPath(pathString);
        this.addElement(curveElement);

        return curveElement;
    }

    drawFunction(f, startX, endX, numPts) {
        var functionElement = this.drawCurve((x) => x, f, startX, endX, numPts);

        return functionElement;
    }

    gridlines(xIncrement = 1, yIncrement = 1, properties = {}) {
        // Is this repetition of the same code ok?
        if (xIncrement > 0) {
            for (var x = this.leftmostX; x <= this.rightmostX; x += xIncrement) {
                var line = this.drawLine(new Vector(x, this.bottommostY, 0), new Vector(x, this.topmostY, 0));
                
                line.setProperty("stroke", "lightgray");
                if ("xGridlines" in properties) {
                    line.setProperties(properties["xGridlines"]);
                }
            }
        }

        if (yIncrement > 0) {
            for (var y = this.bottommostY; y <= this.topmostY; y += yIncrement) {
                var line = this.drawLine(new Vector(this.leftmostX, y, 0), new Vector(this.rightmostX, y, 0));
                
                line.setProperty("stroke", "lightgray");
                if ("yGridlines" in properties) {
                    line.setProperties(properties["yGridlines"]);
                }
            }
        }
        // return all gridlines drawn in two arrays to allow for further customization?
    }

    coordinateAxes(properties = {
        "xAxis" : {},
        "yAxis" : {}
    }) {
        if ("xAxis" in properties) {
            var xAxis = this.drawLine(new Vector(this.leftmostX, 0, 0), new Vector(this.rightmostX, 0, 0));
            xAxis.setProperties(properties["xAxis"]);

            var rightmostPoint = this.getSVGCoords(new Vector(this.rightmostX, 0, 0));
            var xArrowPath = "M " + rightmostPoint.x + " " + rightmostPoint.y + " m -5 -2 l 5 2 l -5 2";
            var xArrow = new SVGPath(xArrowPath);
            this.addElement(xArrow);

            var xLabel = new SVGText("x", new Vector(rightmostPoint.x - 5, rightmostPoint.y + 12, 0), "end");
            xLabel.setProperty("font-family", "MJXTEX-I");
            this.addElement(xLabel);
        }

        if ("yAxis" in properties) {
            var yAxis = this.drawLine(new Vector(0, this.bottommostY, 0), new Vector(0, this.topmost, 0));
            yAxis.setProperties(properties["yAxis"]);

            var topmostPoint = this.getSVGCoords(new Vector(0, this.topmostY, 0));
            var yArrowPath = "M " + topmostPoint.x + " " + topmostPoint.y + " m -5 2 l 5 -2 l 5 2";
            var yArrow = new SVGPath(yArrowPath);
            this.addElement(yArrow);

            var yLabel = new SVGText("y", new Vector(topmostPoint.x - 5, topmostPoint.y + 12, 0), "end");
            yLabel.setProperty("font-family", "MJXTEX-I");
            this.addElement(yLabel);
        }
    }

    displayNumbers(xIncrement = 1, yIncrement = 1, properties = {}) {
        if (xIncrement > 0) {
            for (var x = this.leftmostX; x < this.rightmostX; x += xIncrement) {
                var numberPosition = this.getSVGCoords(new Vector(x, 0, 0));

                var number = new SVGText(x, new Vector(numberPosition.x - 5, numberPosition.y + 12, 0), "end");
                number.setProperty("font-family", "MJXTEX");
                if ("xNumbers" in properties) {
                    number.setProperties(properties["xNumbers"]);
                }
                this.addElement(number);
            }
        }

        if (yIncrement > 0) {
            for (var y = this.bottommostY; y < this.topmostY; y += yIncrement) {
                var numberPosition = this.getSVGCoords(new Vector(0, y, 0));

                var number = new SVGText(y, new Vector(numberPosition.x - 5, numberPosition.y + 12, 0), "end");
                number.setProperty("font-family", "MJXTEX");
                if ("yNumbers" in properties) {
                    number.setProperties(properties["yNumbers"]);
                }
                this.addElement(number);
            }
        }
    }
}

class Plot3D extends PlotSpace {
    constructor(parentElement, windowLeftmostX, windowRightmostX, windowBottommostY, windowTopmostY, eye, distance, xAxis, yAxis) {
        super(parentElement, windowLeftmostX, windowRightmostX, windowBottommostY, windowTopmostY);

        this.E = eye;
        this.D = distance;
        this.X = xAxis.unitVector();
        this.Y = yAxis.unitVector();
        this.P = xAxis.cross(yAxis);
    }

    updateParameters(eye, distance, xAxis, yAxis) {
        this.E = eye;
        this.D = distance;
        this.X = xAxis.unitVector();
        this.Y = yAxis.unitVector();
        this.P = xAxis.cross(yAxis);
    }

    getProjectedCoords(point) {
        var rMinusE = point.subtract(this.E);

        var lambda = this.D / Vector.dotProduct(rMinusE, this.P);
        
        var xCoord = lambda * rMinusE.dot(this.X);
        var yCoord = lambda * rMinusE.dot(this.Y);

        return new Vector(xCoord, yCoord, 0);
    }

    getProjectedSVGCoords(point) {
        var projectedCoords = this.getProjectedCoords(point);
        return this.getSVGCoords(projectedCoords);
    }

    drawLine(start, end) {
        var startMinusE = start.subtract(this.E);
        var endMinusE = end.subtract(this.E);

        var startInFrontOfE = this.P.dot(startMinusE) > 0;
        var endInFrontOfE = this.P.dot(endMinusE) > 0;

        var projectedStartSVG, projectedEndSVG;

        if (startInFrontOfE || endInFrontOfE) {
            if (!startInFrontOfE && endInFrontOfE) {
                // Start point is on/behind the eye; end point is in front.
                var lambda = (this.E.subtract(start).dot(this.P) + 1) / (end.subtract(start).dot(this.P));
                var closestPoint = start.add(end.subtract(start).scale(lambda));
                projectedStartSVG = this.getProjectedSVGCoords(closestPoint);

                projectedEndSVG = this.getProjectedSVGCoords(end);
            } else if (!endInFrontOfE && startInFrontOfE) {
                // End point is on/behind the eye, start point is in front.
                projectedStartSVG = this.getProjectedSVGCoords(start);

                var lambda = (this.E.subtract(end).dot(this.P) + 1) / (start.subtract(end).dot(this.P));
                var closestPoint = end.add(start.subtract(end).scale(lambda));
                projectedEndSVG = this.getProjectedSVGCoords(closestPoint);
            } else {
                // Both points are in front of the eye.
                projectedStartSVG = this.getProjectedSVGCoords(start);
                projectedEndSVG = this.getProjectedSVGCoords(end);
            }

            var lineElement = new SVGLine(projectedStartSVG, projectedEndSVG);
            this.addElement(lineElement);
            return lineElement;
        }
    }

    drawText(text, point, anchor) {
        var svgPoint = this.getProjectedSVGCoords(point);
        var textElement = new SVGText(text, svgPoint, anchor);
        this.addElement(textElement);
        
        return textElement;
    }

    gridlines(xIncrement = 1, yIncrement = 1, zIncrement = 1, properties = {}) {
        var I = new Vector(1, 0, 0);
        var J = new Vector(0, 1, 0);
        var K = new Vector(0, 0, 1);
        
        var eDotP = this.E.dot(this.P);

        var closestXCoord = (eDotP + 1) / I.dot(this.P);
        var closestYCoord = (eDotP + 1) / J.dot(this.P);
        var closestZCoord = (eDotP + 1) / K.dot(this.P);

        var farthestXCoord = (eDotP + 50) / I.dot(this.P);
        var farthestYCoord = (eDotP + 50) / J.dot(this.P);
        var farthestZCoord = (eDotP + 50) / K.dot(this.P);

        xIncrement *= (farthestXCoord - closestXCoord) / Math.abs(farthestXCoord - closestXCoord);
        yIncrement *= (farthestYCoord - closestYCoord) / Math.abs(farthestYCoord - closestYCoord);

        this.drawLine(new Vector(0, 0, farthestZCoord), new Vector(0, 0, 0)); // z axis below the surface

        for (var x = Math.round(closestXCoord); Math.abs(x) < Math.abs(farthestXCoord); x += xIncrement) {
            var start = new Vector(x, farthestYCoord, 0);
            var end = new Vector(x, (eDotP + 1 - x * I.dot(this.P)) / J.dot(this.P), 0);
            var gridline = this.drawLine(start, end);
            if (gridline) {
                gridline.setProperty("stroke", "lightgray");
            }
        }

        for (var y = Math.round(closestYCoord); Math.abs(y) < Math.abs(farthestYCoord); y += yIncrement) {
            var start = new Vector(farthestXCoord, y, 0);
            var end = new Vector((eDotP + 1 - y * J.dot(this.P)) / I.dot(this.P), y, 0);
            var gridline = this.drawLine(start, end);
            if (gridline) {
                gridline.setProperty("stroke", "lightgray");
            }
        }
        
        this.drawLine(new Vector(farthestXCoord, 0, 0), new Vector(closestXCoord, 0, 0));
        this.drawLine(new Vector(0, farthestYCoord, 0), new Vector(0, closestYCoord, 0));

        this.drawLine(new Vector(0, 0, 0), new Vector(0, 0, closestZCoord));
    }

    coordinateAxes() {}

    /*
    drawPath(pathString) {
        var pathElement = new SVGPath(pathString);
        this.addElement(pathElement);

        return pathElement;
    }

    drawCurve(x, y, startT, endT, numPts) {
        var tIncrement = (endT - startT) / numPts;

        var startPoint = this.getSVGCoords([x(startT), y(startT)]);
        var pathString = "M " + startPoint[0] + " " + startPoint[1] + " ";

        for (var t = startT + tIncrement; t <= endT; t += tIncrement) {
            var nextPoint = this.getSVGCoords([x(t), y(t)]);
            pathString += "L " + nextPoint[0] + " " + nextPoint[1] + " ";
        }

        var curveElement = new SVGPath(pathString);
        this.addElement(curveElement);

        return curveElement;
    }
    */

    drawSurface(f, startPoint, endPoint, numPts) {
        // in a rectangular region
        var xIncrement = (endPoint[0] - startPoint[0]) / numPts;
        var yIncrement = (endPoint[1] - startPoint[1]) / numPts;

        for (var x = startPoint.x; x <= endPoint.x; x += xIncrement) {
            for (var y = startPoint.y; y <= endPoint.y; y += yIncrement) {
                var A = new Vector(x, y, f(x, y));
                var B = new Vector(x + xIncrement, y, f(x + xIncrement, y));
                var C = new Vector(x + xIncrement, y + yIncrement, f(x + xIncrement, y + yIncrement));
                var D = new Vector(x, y + yIncrement, f(x, y + yIncrement));

                this.drawLine(A, B);
                this.drawLine(B, C);
                this.drawLine(C, D);
            }
        }
    }
}

var stage = document.getElementById('mid2');

var eyeX = 15;
var eyeY = 10;
var eyeZ = 5;

var xyAngle = -Math.PI/3;
var xzAngle = 0.1;

var zoomAmt = 15;

var eye = new Vector(eyeX, eyeY, eyeZ);
var xAxis = new Vector(Math.cos(xyAngle), Math.sin(xyAngle), 0);
var yAxis = new Vector(Math.sin(xzAngle) * Math.sin(xyAngle), Math.sin(xzAngle) * Math.cos(xyAngle), Math.cos(xzAngle));

var plot = new Plot3D(stage, -20, 20, -10, 10, eye, zoomAmt, xAxis, yAxis);

plot.gridlines();

for (var i = 1; i < 18; i++) {
    var label = plot.drawText(i, new Vector(i, 0, -0.6), "end");
    label.setProperty("font-size", Math.abs(12*i)/(i+1));
    label = plot.drawText(i, new Vector(0, i, -0.6), "end");
    label.setProperty("font-size", Math.abs(12*i)/(i+1));
}

var A = new Vector(4, 2, 0);
var B = new Vector(7, 2, 0);
var C = new Vector(7, 5, 0);
var D = new Vector(4, 5, 0);
var E = new Vector(4, 2, 0);

var F = new Vector(4, 2, 3);
var G = new Vector(7, 2, 3);
var H = new Vector(7, 5, 3);
var I = new Vector(4, 5, 3);
var J = new Vector(4, 2, 3);

var arr = [A, B, C, D, E, F, G, H, I, J];
var colors = ["red", "green", "blue", "pink", "yellow", "orange", "violet", "black", "green"];

function drawbox() {
    for (var i = 1; i < arr.length; i++) {
        var l = plot.drawLine(arr[i - 1], arr[i]);
        l.setProperty("stroke", colors[i-1]);
    }
    
    plot.drawLine(B, G);
    plot.drawLine(C, H);
    plot.drawLine(D, I);

    var P = new Vector(Math.cos(Math.PI/2), Math.sin(Math.PI/2), 0);
    var Q = new Vector(Math.sin(Math.PI/6) * Math.sin(Math.PI/2), Math.sin(Math.PI/6) * Math.cos(Math.PI/2), Math.cos(Math.PI/6));

    var A1 = P.scale(5).add(Q.scale(5));
    var A2 = P.scale(-5).add(Q.scale(5));
    var A3 = P.scale(-5).add(Q.scale(-5));
    var A4 = P.scale(5).add(Q.scale(-5));
    
    plot.drawLine(A1, A2);
    plot.drawLine(A2, A3);
    plot.drawLine(A3, A4);
    plot.drawLine(A4, A1);
}

function walk(e) {
    plot.clear();

    var forward = new Vector(Math.sin(xzAngle) * Math.sin(xyAngle), Math.sin(xzAngle) * Math.cos(xyAngle), 0);
    forward = forward.unitVector();

    var key = e.key;
    if (key == "ArrowUp") {
        eye = eye.add(forward);
    } else if (key == "ArrowDown") {
        eye = eye.subtract(forward);
    } else if (key == "ArrowRight") {
        eye = eye.add(plot.X);
    } else if (key == "ArrowLeft") {
        eye = eye.subtract(plot.X);
    }

    plot.updateParameters(eye, zoomAmt, xAxis, yAxis);
    plot.gridlines();
    drawbox();
}

drawbox();

var lookX = 0;
var lookY = 0;
var clicked = false;

function lookAround1(e) {
    clicked = true;
    lookX = e.clientX;
    lookY = e.clientY;
}

function lookAround(e) {
    if (clicked) {
        plot.clear();

        var x = (e.clientX - lookX) / window.innerWidth;
        x *= Math.PI/6;
        xyAngle += x;
        var y = (lookY - e.clientY) / window.innerHeight;
        eye = eye.add(new Vector(0, 0, y*3));
        // y *= Math.PI/6;
        // xzAngle += y;
        lookX = e.clientX;
        lookY = e.clientY;
        
        xAxis = new Vector(Math.cos(xyAngle), Math.sin(xyAngle), 0);
        yAxis = new Vector(Math.sin(xzAngle) * Math.sin(xyAngle), Math.sin(xzAngle) * Math.cos(xyAngle), Math.cos(xzAngle));

        plot.updateParameters(eye, zoomAmt, xAxis, yAxis);
        plot.gridlines();
        drawbox();
    }
}

function zoom(e) {
    plot.clear();
    zoomAmt += e.deltaY * 0.1;
    plot.updateParameters(eye, zoomAmt, xAxis, yAxis);
    plot.gridlines();
    drawbox();
}

document.addEventListener("keydown", walk);
document.addEventListener("mousedown", lookAround1);
document.addEventListener("mousemove", lookAround);
document.addEventListener("mouseup", (e) => {clicked = false});
document.addEventListener("wheel", zoom);

// function f(x, y) {
//     return (Math.pow(x, 2) + Math.pow(y, 2)) / 2;
// }

// plot.drawSurface(f, [-5, -5], [5, 5], 10);

// var prevEndPt = [0, -2];
// var angle = (Math.PI/180) * 45;
// for (var a = 1; a < 10; a++) {
//     var distance = 1/a;
//     startPt = [prevEndPt[0], prevEndPt[1]];
//     prevEndPt = [startPt[0] + distance*Math.cos(angle), startPt[1] + distance*Math.sin(angle)]
//     plot.drawLine(-7, prevEndPt[1], 10, prevEndPt[1]);
// }

// for (var a = -15; a < 20; a++) {
//     plot.drawLine(0 + a, -2, prevEndPt[0] + a/2, prevEndPt[1]);
//     plot.drawLine(prevEndPt[0] + a/2, prevEndPt[1] + 0.5, 0 + a, 1);
// }

function blankSvgGraph(parentElement, leftmostX, rightmostX, xInc, bottommostY, topmostY, yInc) {
    var svgGraph = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    var graphWidth = rightmostX - leftmostX;
    var graphHeight = topmostY - bottommostY;

    var parentWidth = parentElement.clientWidth;
    var parentHeight = parentElement.clientHeight;

    var dx = parentWidth / graphWidth;
    var dy = parentHeight / graphHeight

    var originX = -dx * leftmostX;
    var originY = dy * topmostY;

    svgGraph.setAttribute("width", parentWidth);
    svgGraph.setAttribute("height", parentHeight);
    svgGraph.setAttribute("preserveAspectRatio", "none");
    svgGraph.setAttribute("viewBox", "0 0 " + parentWidth + " " + parentHeight);

    for (var x = leftmostX; x <= rightmostX; x++) {
        var xtick = document.createElementNS("http://www.w3.org/2000/svg", "text");

        xtick.setAttribute("x", ((x * dx) + originX - 5));
        xtick.setAttribute("y", (originY + 12)) ;
        xtick.setAttribute("font-size", "12");
        xtick.setAttribute("text-anchor", "end");
        xtick.innerHTML = x;

        var gridline = document.createElementNS("http://www.w3.org/2000/svg", "line");

        gridline.setAttribute("x1", ((x * dx) + originX));
        gridline.setAttribute("y1", 0);
        gridline.setAttribute("x2", ((x * dx) + originX));
        gridline.setAttribute("y2", parentHeight);
        gridline.setAttribute("stroke", "lightgray");
        gridline.setAttribute("stroke-width", "1");

        svgGraph.appendChild(xtick);
        svgGraph.appendChild(gridline);
    }

    for (var y = bottommostY; y <= topmostY; y++) {
        var ytick = document.createElementNS("http://www.w3.org/2000/svg", "text");

        ytick.setAttribute("y", (originY - (y * dy) + 12));
        ytick.setAttribute("x", (originX - 5)) ;
        ytick.setAttribute("font-size", "12");
        ytick.setAttribute("text-anchor", "end");
        ytick.innerHTML = y;

        var gridline = document.createElementNS("http://www.w3.org/2000/svg", "line");

        gridline.setAttribute("x1", 0);
        gridline.setAttribute("y1", (originY - (y * dy)));
        gridline.setAttribute("x2", parentWidth);
        gridline.setAttribute("y2", (originY - (y * dy)));
        gridline.setAttribute("stroke", "lightgray");
        gridline.setAttribute("stroke-width", "1");

        svgGraph.appendChild(ytick);
        svgGraph.appendChild(gridline);
    }

    var pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");

    // maybe use line svg elements?
    var linePath = "M 0 " + originY + " L " + parentWidth + " " + originY; // xaxis
    linePath += "m -7 -2 l 7 2 l -7 2"; // arrow
    linePath += " M " + originX + " " + parentHeight + " L " + originX + " 0"; // yaxis
    linePath += "m -2 7 l 2 -7 l 2 7";

    pathElement.setAttribute("d", linePath);
    pathElement.setAttribute("stroke", "black");
    pathElement.setAttribute("stroke-width", "1");
    pathElement.setAttribute("fill", "transparent");

    svgGraph.appendChild(pathElement);

    var xlabel = document.createElementNS("http://www.w3.org/2000/svg", "text");

    xlabel.setAttribute("x", (parentWidth - 5));
    xlabel.setAttribute("y", (originY - 5)) ;
    xlabel.setAttribute("font-size", "12");
    xlabel.setAttribute("font-family", "MJXTEX-I");
    xlabel.setAttribute("text-anchor", "end");
    xlabel.innerHTML = "x";

    svgGraph.appendChild(xlabel);

    var ylabel = document.createElementNS("http://www.w3.org/2000/svg", "text");

    ylabel.setAttribute("x", (originX + 5));
    ylabel.setAttribute("y",  12) ;
    ylabel.setAttribute("font-size", "12");
    ylabel.setAttribute("font-family", "MJXTEX-I");
    ylabel.setAttribute("text-anchor", "start");
    ylabel.innerHTML = "y";

    svgGraph.appendChild(ylabel);

    parentElement.appendChild(svgGraph);

    return [svgGraph, originX, originY, dx, dy];
}

function plotGraph(svgData, f, startX, endX, numPts) {
	var svgGraph = svgData[0];
	var originX = svgData[1];
	var originY = svgData[2];
	var dx = svgData[3];
	var dy = svgData[4];

	var increment = (endX - startX) / numPts;

    var pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");

    var linePath = "M " + ((startX * dx) + originX) + " " + (originY - (f(startX) * dy));

    for (var x = startX + increment; x < endX; x += increment) {
    	linePath += " L " + ((x * dx) + originX) + " " + (originY -(f(x) * dy));
    }

    pathElement.setAttribute("d", linePath);
    pathElement.setAttribute("stroke", "black");
    pathElement.setAttribute("stroke-width", "1");
    pathElement.setAttribute("fill", "transparent");

    svgGraph.appendChild(pathElement);
}

var a = blankSvgGraph(document.getElementById("mid"), -7, 10, 1, -2, 2, 1);

var f = function(x) {
    var flor = Math.floor(x);
    if (Math.abs(flor % 2) == 1) {
        return 1;
    } else {
        return -1;
    }
}