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
    constructor(x1, y1, x2, y2) {
        var lineElement = super("line");

        lineElement.setProperties({
            "x1" : x1,
            "y1" : y1,
            "x2" : x2,
            "y2" : y2,
            "stroke" : "black",
            "stroke-width" : 1,
        });

        return lineElement;
    }
}

class SVGText extends SVGElement {
    constructor(text, x, y, anchor) {
        // look at text wrapping. needs to be set with css.
        var textElement = super("text");

        textElement.setProperties({
            "x" : x,
            "y" : y,
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

class Plot extends SVGStage {
    #dx;
    #dy;
    #originX;
    #originY;
    #leftmostX;
    #rightmostX;
    #bottommostY;
    #topmostY;

    constructor(parentElement, leftmostX, rightmostX, bottommostY, topmostY) {
        super(parentElement);

        this.#leftmostX = leftmostX;
        this.#rightmostX = rightmostX;
        this.#bottommostY = bottommostY;
        this.#topmostY = topmostY;

        this.#dx = this.width / (rightmostX - leftmostX);
        this.#dy = this.height / (topmostY - bottommostY);

        this.#originX = -this.#dx * leftmostX;
        this.#originY = this.#dy * topmostY;
    }

    getSVGCoords(x, y) {
        var svgX = (x * this.#dx) + this.#originX;
        var svgY = this.#originY - (y * this.#dy);
        return {
            "x" : svgX,
            "y" : svgY
        };
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
                var svgCoords = this.getSVGCoords(x, y);
                x = svgCoords.x;
                y = svgCoords.y;
            }

            svgPathString += command + " " + x + " " + y + " ";
        }

        return svgPathString;
    }

    drawGridlines(xIncrement = 1, yIncrement = 1, properties = {}, properties2 = {}) {
        if (xIncrement > 0) {
            for (var x = this.#leftmostX; x <= this.#rightmostX; x += xIncrement) {
                var startPoint = this.getSVGCoords(x, this.#bottommostY);
                var endPoint = this.getSVGCoords(x, this.#topmostY);

                var line = new SVGLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
                line.setProperty("stroke", "lightgray");
                this.addElement(line);
            }
        }

        if (yIncrement > 0) {
            for (var y = this.#bottommostY; y <= this.#topmostY; y += yIncrement) {
                var startPoint = this.getSVGCoords(this.#leftmostX, y);
                var endPoint = this.getSVGCoords(this.#rightmostX, y);
            
                var line = new SVGLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
                line.setProperty("stroke", "lightgray");
                this.addElement(line);
            }
        }
    }

    drawCoordinateAxes(xAxis = true, yAxis = true) {
        if (xAxis) {
            var startPoint = this.getSVGCoords(this.#leftmostX, 0);
            var endPoint = this.getSVGCoords(this.#rightmostX, 0);
            
            var xaxis = new SVGLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
            this.addElement(xaxis);

            var arrowPathString = this.getSVGPathString("M " + this.#rightmostX + " 0");
            arrowPathString += "m -5 -2 l 5 2 l -5 2";
            var rightArrow = new SVGPath(arrowPathString);
            this.addElement(rightArrow);

            var labelPos = this.getSVGCoords(this.#rightmostX, 0);
            var xlabel = new SVGText("x", labelPos.x - 5, labelPos.y + 12, "end");
            xlabel.setProperty("font-family", "MJXTEX-I");
            this.addElement(xlabel);
        }

        if (yAxis) {
            var startPoint = this.getSVGCoords(0, this.#bottommostY);
            var endPoint = this.getSVGCoords(0, this.#topmostY);
            
            var yaxis = new SVGLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
            this.addElement(yaxis);

            var arrowPathString = this.getSVGPathString("M 0 " + this.#topmostY);
            arrowPathString += "m -2 5 l 2 -5 l 2 5";
            var topArrow = new SVGPath(arrowPathString);
            this.addElement(topArrow);

            var labelPos = this.getSVGCoords(0, this.#topmostY);
            var ylabel = new SVGText("y", labelPos.x - 5, labelPos.y + 12, "end");
            ylabel.setProperty("font-family", "MJXTEX-I");
            this.addElement(ylabel);
        }
    }

    displayNumbers(xIncrement = 1, yIncrement = 1) {
        if (xIncrement > 0) {
            for (var x = this.#leftmostX; x < this.#rightmostX; x += xIncrement) {
                var numberPos = this.getSVGCoords(x, 0);

                var number = new SVGText(x, numberPos.x - 5, numberPos.y + 12, "end");
                number.setProperty("font-family", "MJXTEX");
                this.addElement(number);
            }
        }

        if (yIncrement > 0) {
            for (var y = this.#bottommostY; y < this.#topmostY; y += yIncrement) {
                var numberPos = this.getSVGCoords(0, y);

                var number = new SVGText(y, numberPos.x - 5, numberPos.y + 12, "end");
                number.setProperty("font-family", "MJXTEX");
                this.addElement(number);
            }
        }
    }

    drawLine(x1, y1, x2, y2) {
        var startPt = this.getSVGCoords(x1, y1);
        var endPt = this.getSVGCoords(x2, y2);
        var lineElement = new SVGLine(startPt.x, startPt.y, endPt.x, endPt.y);
        this.addElement(lineElement);
        
        return lineElement;
    }

    addText(text, x, y, anchor) {
        var textElement = new SVGText(text, x, y, anchor);
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

        var point = this.getSVGCoords(x(startT), y(startT));
        var pathString = "M " + point.x + " " + point.y + " ";

        for (var t = startT + tIncrement; t <= endT; t += tIncrement) {
            point = this.getSVGCoords(x(t), y(t));
            pathString += "L " + point.x + " " + point.y + " ";
        }

        var curveElement = new SVGPath(pathString);
        this.addElement(curveElement);

        return curveElement;
    }
}

class Plot3D extends Plot {
    constructor(parentElement, eye, distance, xAxis, yAxis) {
        super(parentElement, -30, 30, -10, 10);

        this.E = eye;
        this.D = distance;
        this.X = xAxis;
        this.Y = yAxis;
    }

    getProjectionOf(point) {
        var rMinusE = point.add(this.E.scale(-1));
        
        var xCoord = this.D * Vector.dotProduct(rMinusE, this.X);
        var yCoord = this.D * Vector.dotProduct(rMinusE, this.Y);

        var denominator = Vector.dotProduct(rMinusE, this.X.cross(this.Y));

        return {
            "x" : xCoord / denominator,
            "y" : yCoord / denominator,
        }
    }
}

var stage = document.getElementById('mid2');
var eye = new Vector(12, 12, 6);
var xAxis = new Vector(1, -1, 0);
xAxis = xAxis.scale(1/xAxis.magnitude);
var yAxis = new Vector(-1, -1, 3);
yAxis = yAxis.scale(1/yAxis.magnitude);
var plot = new Plot3D(stage, eye, 20, xAxis, yAxis);

var prevPt = plot.getProjectionOf(new Vector(0, 0, 0));
for (var i = 20; i > -10; i--) {
    var pt = new Vector(i, 0, 0);
    var projectedCoords = plot.getProjectionOf(pt);
    plot.drawLine(prevPt.x, prevPt.y, projectedCoords.x, projectedCoords.y);
    plot.drawLine(projectedCoords.x - 0.2, projectedCoords.y, projectedCoords.x + 0.2, projectedCoords.y);
    prevPt = projectedCoords;
}

var prevPt = plot.getProjectionOf(new Vector(0, 0, 0));
for (var i = 20; i > -10; i--) {
    var pt = new Vector(0, i, 0);
    var projectedCoords = plot.getProjectionOf(pt);
    plot.drawLine(prevPt.x, prevPt.y, projectedCoords.x, projectedCoords.y);
    plot.drawLine(projectedCoords.x - 0.2, projectedCoords.y, projectedCoords.x + 0.2, projectedCoords.y);
    prevPt = projectedCoords;
}

var prevPt = plot.getProjectionOf(new Vector(0, 0, 0));
for (var i = 5; i > -10; i--) {
    var pt = new Vector(0, 0, i);
    var projectedCoords = plot.getProjectionOf(pt);
    plot.drawLine(prevPt.x, prevPt.y, projectedCoords.x, projectedCoords.y);
    plot.drawLine(projectedCoords.x - 0.2, projectedCoords.y, projectedCoords.x + 0.2, projectedCoords.y);
    prevPt = projectedCoords;
}

var A = new Vector(4, 0, 0);
var B = new Vector(7, 0, 0);
var C = new Vector(7, 3, 0);
var D = new Vector(4, 3, 0);
var E = new Vector(4, 0, 0);

var F = new Vector(4, 0, 3);
var G = new Vector(7, 0, 3);
var H = new Vector(7, 3, 3);
var I = new Vector(4, 3, 3);
var J = new Vector(4, 0, 3);

var arr = [A, B, C, D, E, F, G, H, I, J];
for (var i = 1; i < arr.length; i++) {
    var start = plot.getProjectionOf(arr[i-1]);
    var end = plot.getProjectionOf(arr[i]);
    plot.drawLine(start.x, start.y, end.x, end.y);
}

start = plot.getProjectionOf(B);
end = plot.getProjectionOf(G);
plot.drawLine(start.x, start.y, end.x, end.y);
start = plot.getProjectionOf(C);
end = plot.getProjectionOf(H);
plot.drawLine(start.x, start.y, end.x, end.y);
start = plot.getProjectionOf(D);
end = plot.getProjectionOf(I);
plot.drawLine(start.x, start.y, end.x, end.y);


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