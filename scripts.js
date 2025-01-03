var baselines = {
    "top" : "hanging",
    "middle" : "middle",
    "bottom" : "baseline"
};

class SVGElement {
    htmlElement;

    constructor(name) {
        this.htmlElement = document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    setProperties(properties) {
        for (property in properties) {
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
            "color" : "black",
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
            "line-color" : "black",
            "line-width" : 1,
            "fill" : "transparent",
        });
        
        return pathElement;
    }
}

class SVGStage {
    htmlElement

    width;
    height;

    constructor(parentElement) {        
        this.width = parentElement.clientWidth;
        this.height = parentElement.clientHeight;

        var htmlElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        htmlElement.setAttribute("width", this.width);
        htmlElement.setAttribute("height", this.height);
        htmlElement.setAttribute("preserveAspectRatio", "none");
        htmlElement.setAttribute("viewBox", "0 0 " + this.width + " " + this.height);

        this.htmlElement = htmlElement;

        parentElement.appendChild(htmlElement);
    }

    addElement(element) {
        this.htmlElement.appendChild(element.htmlElement);
    }
}

class Curve {
    constructor(x, y, startT, endT, numPts) {

    }
};

class GraphLine extends Curve {
    constructor() {

    }
};

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

    // given string in user coords, turn to svg coord string, that can be passed to addPath

    drawGridlines(xIncrement = 1, yIncrement = 1, properties = {}, properties2 = {}) {
        // Make a way to pass properties

        if (xIncrement > 0) {
            for (var x = this.#leftmostX; x <= this.#rightmostX; x += xIncrement) {
                var startPoint = this.getSVGCoords(x, this.#bottommostY);
                var endPoint = this.getSVGCoords(x, this.#topmostY);
            
                this.addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, {
                    "width" : 1,
                    "color" : "lightgray"
                });
            }
        }

        if (yIncrement > 0) {
            for (var y = this.#bottommostY; y <= this.#topmostY; y += yIncrement) {
                var startPoint = this.getSVGCoords(this.#leftmostX, y);
                var endPoint = this.getSVGCoords(this.#rightmostX, y);
            
                this.addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, {
                    "width" : 1,
                    "color" : "lightgray"
                });
            }
        }
    }

    drawCoordinateAxes(xAxis = true, yAxis = true) {
        // So make a nice way of passing in the ability to pass required options nicely. For the time being
        // IG I will implement every property.

        if (xAxis) {
            var startPoint = this.getSVGCoords(this.#leftmostX, 0);
            var endPoint = this.getSVGCoords(this.#rightmostX, 0);
            
            this.addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, {
                "width" : 1,
                "color" : "black"
            });

            var arrowPathString = this.getSVGPathString("M " + this.#rightmostX + " 0");
            arrowPathString += "m -5 -2 l 5 2 l -5 2";
            this.addPath(arrowPathString);

            var labelPos = this.getSVGCoords(this.#rightmostX, 0);
            this.addText("x", labelPos.x - 5, labelPos.y + 12, "end", "top", {
                "font-family" : "MJXTEX-I",
                "font-size" : 12,
                "color" : "black",
            });
        }

        if (yAxis) {
            var startPoint = this.getSVGCoords(0, this.#bottommostY);
            var endPoint = this.getSVGCoords(0, this.#topmostY);
            
            this.addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, {
                "width" : 1,
                "color" : "black"
            });

            var arrowPathString = this.getSVGPathString("M 0 " + this.#topmostY);
            arrowPathString += "m -2 5 l 2 -5 l 2 5";
            this.addPath(arrowPathString);

            var labelPos = this.getSVGCoords(0, this.#topmostY);
            this.addText("y", labelPos.x - 5, labelPos.y + 12, "end", "top", {
                "font-family" : "MJXTEX-I",
                "font-size" : 12,
                "color" : "black",
            });
        }
    }

    displayNumbers(xIncrement = 1, yIncrement = 1) {
        if (xIncrement > 0) {
            for (var x = this.#leftmostX; x < this.#rightmostX; x += xIncrement) {
                var pos = this.getSVGCoords(x, 0);
            
                this.addText(x, pos.x - 4, pos.y + 12, "end", "top", {
                    "font-family" : "MJXTEX",
                    "font-size" : 12,
                    "color" : "black",
                });
            }
        }

        if (yIncrement > 0) {
            for (var y = this.#bottommostY; y < this.#topmostY; y += yIncrement) {
                var pos = this.getSVGCoords(0, y);
            
                this.addText(y, pos.x - 4, pos.y + 12, "end", "top", {
                    "font-family" : "MJXTEX",
                    "font-size" : 12,
                    "color" : "black",
                });
            }
        }
    }

    plot(curve) {

    }
}

var stage = document.getElementById('mid2');
var plot = new Plot(stage, -7, 10, -2, 2);
plot.drawGridlines();
plot.drawCoordinateAxes();
plot.displayNumbers();

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