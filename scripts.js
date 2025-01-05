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
            "x1" : start[0],
            "y1" : start[1],
            "x2" : end[0],
            "y2" : end[1],
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
            "x" : point[0],
            "y" : point[1],
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
        var svgX = (point[0] * this.#dx) + this.#originX;
        var svgY = this.#originY - (point[1] * this.#dy);
        return [svgX, svgY];
    }

    getSVGPathString(userCoordString) {
        var svgPathString = "";

        var entries = userCoordString.split(" ");

        for (var entryIndex = 0; entryIndex < entries.length; entryIndex += 3) {
            var command = entries[entryIndex];
            var x = parseFloat(entries[entryIndex + 1]);
            var y = parseFloat(entries[entryIndex + 2]);

            if (command === command.toLowerCase()) {
                x *= this.#dx;
                y *= this.#dy;
            } else {
                [x, y] = this.getSVGCoords([x, y]);
            }

            svgPathString += command + " " + x + " " + y + " ";
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

    drawFunction(f, startX, endX, numPts) {
        var functionElement = this.drawCurve((x) => x, f, startX, endX, numPts);

        return functionElement;
    }

    gridlines(xIncrement = 1, yIncrement = 1, properties = {}) {
        // Is this repetition of the same code ok?
        if (xIncrement > 0) {
            for (var x = this.leftmostX; x <= this.rightmostX; x += xIncrement) {
                var line = this.drawLine([x, this.bottommostY], [x, this.topmostY]);
                
                line.setProperty("stroke", "lightgray");
                if ("xGridlines" in properties) {
                    line.setProperties(properties["xGridlines"]);
                }
            }
        }

        if (yIncrement > 0) {
            for (var y = this.bottommostY; y <= this.topmostY; y += yIncrement) {
                var line = this.drawLine([this.leftmostX], [y, this.rightmostX, y]);
                
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
            var xAxis = this.drawLine([this.leftmostX, 0], [this.rightmostX, 0]);
            xAxis.setProperties(properties["xAxis"]);

            var rightmostPoint = this.getSVGCoords([this.rightmostX, 0]);
            var xArrowPath = "M " + rightmostPoint[0] + " " + rightmostPoint[1] + " m -5 -2 l 5 2 l -5 2";
            var xArrow = new SVGPath(xArrowPath);
            this.addElement(xArrow);

            var xLabel = new SVGText("x", [rightmostPoint[0] - 5, rightmostPoint[1] + 12], "end");
            xLabel.setProperty("font-family", "MJXTEX-I");
            this.addElement(xLabel);
        }

        if ("yAxis" in properties) {
            var yAxis = this.drawLine([0, this.bottommostY], [0, this.topmostY]);
            yAxis.setProperties(properties["yAxis"]);

            var topmostPoint = this.getSVGCoords([0, this.topmostY]);
            var yArrowPath = "M " + topmostPoint[0] + " " + topmostPoint[1] + " m -5 2 l 5 -2 l 5 2";
            var yArrow = new SVGPath(yArrowPath);
            this.addElement(yArrow);

            var yLabel = new SVGText("y", [topmostPoint[0] - 5, topmostPoint[1] + 12], "end");
            yLabel.setProperty("font-family", "MJXTEX-I");
            this.addElement(yLabel);
        }
    }

    displayNumbers(xIncrement = 1, yIncrement = 1, properties = {}) {
        if (xIncrement > 0) {
            for (var x = this.leftmostX; x < this.rightmostX; x += xIncrement) {
                var numberPosition = this.getSVGCoords([x, 0]);

                var number = new SVGText(x, [numberPosition[0] - 5, numberPosition[1] + 12], "end");
                number.setProperty("font-family", "MJXTEX");
                if ("xNumbers" in properties) {
                    number.setProperties(properties["xNumbers"]);
                }
                this.addElement(number);
            }
        }

        if (yIncrement > 0) {
            for (var y = this.bottommostY; y < this.topmostY; y += yIncrement) {
                var numberPosition = this.getSVGCoords([0, y]);

                var number = new SVGText(y, [numberPosition[0] - 5, numberPosition[1] + 12], "end");
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
        this.X = xAxis;
        this.Y = yAxis;
    }

    getProjectedCoords(point) {
        var r = new Vector(point[0], point[1], point[2]);

        var rMinusE = r.add(this.E.scale(-1));
        
        var xCoord = this.D * Vector.dotProduct(rMinusE, this.X);
        var yCoord = this.D * Vector.dotProduct(rMinusE, this.Y);

        var denominator = Vector.dotProduct(rMinusE, this.X.cross(this.Y));
        
        xCoord /= denominator;
        yCoord /= denominator;

        return [xCoord, yCoord];
    }

    getProjectedSVGCoords(point) {
        var projectedCoords = this.getProjectedCoords(point);
        return this.getSVGCoords(projectedCoords);
    }

    drawLine(start, end) {
        var projectedStartSVG = this.getProjectedSVGCoords(start);
        var projectedEndSVG = this.getProjectedSVGCoords(end);
        var lineElement = new SVGLine(projectedStartSVG, projectedEndSVG);
        this.addElement(lineElement);
        
        return lineElement;
    }

    /*
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

    drawFunction(f, startX, endX, numPts) {
        var functionElement = this.drawCurve((x) => x, f, startX, endX, numPts);

        return functionElement;
    }
    */
}

var stage = document.getElementById('mid2');
var eye = new Vector(5, 13, 5);
var xAxis = new Vector(1, -0.1, 0);
xAxis = xAxis.scale(1/xAxis.magnitude);
var yAxis = new Vector(0, 0, 1);
yAxis = yAxis.scale(1/yAxis.magnitude);
var plot = new Plot3D(stage, -20, 20, -10, 10, eye, 8, xAxis, yAxis);

plot.drawLine([0, 0, -10], [0, 0, 0]);

var closestXCoord = plot.E.dot(plot.X.cross(plot.Y));
closestXCoord = closestXCoord / Vector.dotProduct(new Vector (1, 0, 0), plot.X.cross(plot.Y));

var closestYCoord = plot.E.dot(plot.X.cross(plot.Y));
closestYCoord = closestYCoord / Vector.dotProduct(new Vector (0, 1, 0), plot.X.cross(plot.Y));

for (var x = -40; x < closestXCoord - 1; x++) {
    var pt = [x, 0, 0];
    var closestY = plot.E.dot(plot.X.cross(plot.Y)) - x * Vector.dotProduct(plot.X.cross(plot.Y), new Vector(1, 0, 0));
    closestY = closestY / Vector.dotProduct(new Vector(0, 1, 0), plot.X.cross(plot.Y));
    var gridline = plot.drawLine([pt[0], pt[1] - 30, pt[2]], [pt[0], closestY - 1, pt[2]]);
    gridline.setProperty("stroke", "lightgray");
}

for (var y = -40; y < closestYCoord; y++) {
    var pt = [0, y, 0];
    var closestX = plot.E.dot(plot.X.cross(plot.Y)) - y * Vector.dotProduct(plot.X.cross(plot.Y), new Vector(0, 1, 0));
    closestX = closestX / Vector.dotProduct(new Vector(1, 0, 0), plot.X.cross(plot.Y));
    var gridline = plot.drawLine([pt[0] - 30, pt[1], pt[2]], [closestX - 1, pt[1], pt[2]]);
    gridline.setProperty("stroke", "lightgray");
}

// for (var i = 20; i > -10; i--) {
//     var pt = [0, 0, i];
//     plot.drawLine([0, 0, i - 1], pt);
//     plot.drawLine([pt[0] - 0.2, pt[1] - 0.2, pt[2]], [pt[0] + 0.2, pt[1] + 0.2, pt[2]]);
// }

var xax = plot.drawLine([-40, 0, 0], [closestXCoord - 1, 0, 0]);
plot.drawLine([0, -40, 0], [0, closestYCoord - 1, 0]);
plot.drawLine([0, 0, 0], [0, 0, 10]);

var A = [4, 2, 0];
var B = [7, 2, 0];
var C = [7, 5, 0];
var D = [4, 5, 0];
var E = [4, 2, 0];

var F = [4, 2, 3];
var G = [7, 2, 3];
var H = [7, 5, 3];
var I = [4, 5, 3];
var J = [4, 2, 3];

var arr = [A, B, C, D, E, F, G, H, I, J];
for (var i = 1; i < arr.length; i++) {
    plot.drawLine(arr[i - 1], arr[i]);
}

plot.drawLine(B, G);
plot.drawLine(C, H);
plot.drawLine(D, I);


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