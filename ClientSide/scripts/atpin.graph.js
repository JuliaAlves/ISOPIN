ATPIN.Graph = function() {
	this.initialize.apply(this, arguments);
};

(function(module) {

	var EDGE_COLOR = "rgba(150, 150, 150, 0.5)",

		NODE_COLOR = "yellowGreen",
		NODE_EDGE_THICKNESS = 4,
		NODE_SIZE = 12,
		NODE_RADIUS = 4,

		SATELLITE_EDGE_THICKNESS = 4,
		SATELLITE_SIZE = 8,
		SATELLITE_RADIUS = 24;

	var __svgNS__ = "http://www.w3.org/2000/svg";

	// Construtor
	module.prototype.initialize = function(svg) {
		this._svg = svg;
		this._viewport = $(document.createElementNS(__svgNS__, "g"));
		this._viewport.attr("id", "viewport");
		this._viewport.attr("transform", "scale(1, 1)");
		this._viewport.css({ transformOrigin: "center center" });
		this._svg.append(this._viewport);

		this._vertices = [];
		this._satellites = [];
		this._satelliteVerticesCount = 0;
	};

	module.prototype.addVertex = function(vx) {
		this._vertices.push(vx);
	};

	function randomColor() {
		var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++ )
            color += letters[Math.floor(Math.random() * letters.length)];

        return color;
	}

	module.prototype.addSatelliteVertex = function(vx, sat) {
		if (!this._satellites[vx])
		{
			this._satellites[vx] = [];
			this._satellites[vx].color = randomColor();
		}

		this._satellites[vx].push(sat);
		this._satelliteVerticesCount++;
	};

	module.prototype.position = function(vx) {
		var i = this._vertices.indexOf(vx);
		var theta = Math.PI * 2 / this._vertices.length * i;
		var r = NODE_RADIUS * this._satelliteVerticesCount;

		return {
			x: this.width / 2 + Math.cos(theta) * r,
			y: this.height / 2 + Math.sin(theta) * r
		};
	}

	module.prototype.render = function() {
		this._viewport.empty();

		var nodes = [], edges = [];

		for (var i = 0; i < this._vertices.length; i++)
		{
			var pos = this.position(this._vertices[i]);

			var circle = $(document.createElementNS(__svgNS__, "circle"));
			circle.append("<title>" + this._vertices[i] + "</title>");
			var title = document.createElementNS(__svgNS__, "title");
			$(title).text(this._vertices[i]);
			circle.append(title);
			circle.attr("cx", pos.x);
			circle.attr("cy", pos.y);
			circle.attr("r", NODE_SIZE);
			circle.attr("fill", NODE_COLOR);

			for (var j = i + 1; j < this._vertices.length; j++)
			{
				var pos1 = this.position(j);

				var edge = $(document.createElementNS(__svgNS__, "line"));
				var title = document.createElementNS(__svgNS__, "title");
				$(title).text(this._vertices[i] + " -> " + this._vertices[j]);
				edge.append(title);
				edge.attr("x1", pos.x);
				edge.attr("y1", pos.y);
				edge.attr("x2", pos1.x);
				edge.attr("y2", pos1.y);
				edge.attr("stroke", EDGE_COLOR);
				edge.css({ strokeWidth: NODE_EDGE_THICKNESS });
				edges.push(edge);
			}

			nodes.push(circle);
		}
		
		for (var o in this._satellites)
		{
			if (!this._satellites.hasOwnProperty(o)) continue;

			origin = o.split(",");
			var op;

			var mx = 0, my = 0;

			for (var i = 0; i < origin.length; i++)
			{
				var p = this.position(origin[i]);
				mx += p.x;
				my += p.y;
			}

			op = { x: mx / origin.length, y: my / origin.length };

			var r = SATELLITE_RADIUS * Math.sqrt(this._satellites[o].length);

			for (var i = 0; i < this._satellites[o].length; i++)
			{
				var theta = Math.PI / Math.sqrt(this._satellites[o].length) + Math.PI * 2 / this._satellites[o].length * i,
					x = op.x + Math.cos(theta) * r,
					y = op.y + Math.sin(theta) * r;

				for (var j = 0; j < origin.length; j++)
				{
					var op1 = this.position(origin[j]);

					var edge = $(document.createElementNS(__svgNS__, "line"));
					var title = document.createElementNS(__svgNS__, "title");
					$(title).text(this._satellites[o][i] + " -> " + origin[j]);
					edge.append(title);
					edge.attr("x1", x);
					edge.attr("y1", y);
					edge.attr("x2", op1.x);
					edge.attr("y2", op1.y);				
					edge.attr("stroke", EDGE_COLOR);
					edge.css({ strokeWidth: SATELLITE_EDGE_THICKNESS });
					edges.push(edge);
				}

				var circle = $(document.createElementNS(__svgNS__, "circle"));
				var title = document.createElementNS(__svgNS__, "title");
				$(title).text(this._satellites[o][i]);
				circle.append(title);
				circle.attr("cx", x);
				circle.attr("cy", y);
				circle.attr("r", SATELLITE_SIZE);
				circle.attr("fill", this._satellites[o].color);
				nodes.push(circle);
			}
		}

		for (var i = 0; i < edges.length; i++)
			this._viewport.append(edges[i]);

		for (var i = 0; i < nodes.length; i++)
			this._viewport.append(nodes[i]);

		this._svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
	};

	Object.defineProperties(module.prototype, {
		width: {
			get: function() {
				return this._svg.attr("width");
			},

			set: function(value) {
				this._svg.attr("width", value);
			}
		},

		height: {
			get: function() {
				return this._svg.attr("height");
			},

			set: function(value) {
				this._svg.attr("height", value);
			}
		}
	});

})(ATPIN.Graph);