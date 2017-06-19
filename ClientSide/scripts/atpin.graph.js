ATPIN.Graph = function() {
	this.initialize.apply(this, arguments);
};

(function(module) {

	//
	// Constantes
	//
	var EDGE_COLOR = "rgba(150, 150, 150, 0.5)",
		EDGE_BASE_THICKNESS = 4,

		NODE_COLOR = "yellowGreen",
		NODE_BASE_SIZE = 4,
		NODE_BASE_DISTANCE = 128;

	var __svgNS__ = "http://www.w3.org/2000/svg";

	//
	// Construtor
	//
	//	svg 	: SVG no qual o grafo será desenhado
	//
	module.prototype.initialize = function(svg) {
		this._svg = svg;
		this._viewport = $(document.createElementNS(__svgNS__, "g"));
		this._viewport.attr("id", "viewport");
		this._viewport.attr("transform", "scale(1, 1) translate(0, 0)");
		this._viewport.css({ transformOrigin: "center center" });
		this._svg.append(this._viewport);

		this._vertices = [];
		this._edges = [];
	};

	//
	// Adiciona um vértice no grafo
	//
	//	vx 	: Valor do vértice
	//
	module.prototype.addVertex = function(vx) {
		this._vertices.push(vx);
	};

	//
	// Adiciona uma aresta no grafo ligando dois vértices
	//
	//	src 	: Vértice de origem
	//	dest 	: Vértice de destino
	//	weight	: Peso da aresta (Opcional)
	//
	module.prototype.addEdge = function(src, dest, weight) { 
		if (!weight)
			weight = 1;

		this._edges.push({ source: src, dest: dest, weight: weight });
	}

	//
	// Obtém a lista de arestas que apontam para um vértice
	//
	//	vx 	: Vértice em questão
	//
	module.prototype.incomingEdges = function(vx) {
		var v = [];

		for (var i = 0; i < this._edges.length; i++)
			if (this._edges[i].dest == vx)
				v.push(this._edges[i]);

		return v;
	}

	//
	// Obtém a lista de arestas que saem de um vértice
	//
	//	vx 	: Vértice em questão
	//
	module.prototype.outcomingEdges = function(vx) {
		var v = [];

		for (var i = 0; i < this._edges.length; i++)
			if (this._edges[i].source == vx)
				v.push(this._edges[i]);

		return v;
	}

	//
	// Obtém os nós centrais (de que nenhuma aresta sai)
	//
	module.prototype.centralNodes = function() {
		var v = [];

		for (var i = 0; i < this._vertices.length; i++)
			if (this.outcomingEdges(this._vertices[i]).length == 0)
				v.push(this._vertices[i]);

		return v;
	}

	//
	// Calcula a posição para um vértice na tela
	//
	//	vx 	: Vértice
	//
	module.prototype.position = function(vx) {

		var outcoming = this.outcomingEdges(vx),
			size = this.size(vx),
			index = this._vertices.indexOf(vx);

		if (index == 0)
		{
			return {
				x: this.width / 2,
				y: this.height / 2
			};
		}

		if (outcoming.length == 0)
		{
			return {
				x: this.width / 2 + Math.cos(index / this._vertices.length * Math.PI * 2) * NODE_BASE_DISTANCE * 3,
				y: this.height / 2 + Math.sin(index / this._vertices.length * Math.PI * 2) * NODE_BASE_DISTANCE * 3
			};
		}

		var x = 0, y = 0;
		for (var i = 0; i < outcoming.length; i++)
		{
			var p = this.position(outcoming[i].dest);
			x += p.x;
			y += p.y;
		}

		x /= outcoming.length;
		y /= outcoming.length;

		var theta = 0;
		for (var i = 0; i < outcoming.length; i++)
		{
			var incoming = this.incomingEdges(outcoming[i].dest);

			var j;
			for (j = 0; j < incoming.length; j++)
				if (incoming[j].source == vx)
					break;

			theta += Math.PI * 2 / incoming.length * j;
		}

		theta /= outcoming.length;

		return {
			x: x + Math.cos(theta) * NODE_BASE_DISTANCE,
			y: y + Math.sin(theta) * NODE_BASE_DISTANCE
		};
	}

	//
	// Calcula o tamanho de um nó no grafo
	//
	//	vx 	: Vértice
	//
	module.prototype.size = function(vx) {
		return NODE_BASE_SIZE * Math.sqrt(this.incomingEdges(vx).length + 1);
	}

	//
	// Cria um círculo SVG com as informações dadas por parâmetro
	//
	function newCircle(position, text, radius, color) {
		var circle = $(document.createElementNS(__svgNS__, "circle"));
		var title = document.createElementNS(__svgNS__, "title");
		$(title).text(text);
		circle.append(title);
		circle.attr("cx", position.x);
		circle.attr("cy", position.y);
		circle.attr("r", radius);
		circle.attr("fill", color);

		return circle;
	}

	//
	// Cria um círculo SVG com as informações dadas por parâmetro
	//
	function newLine(positionA, positionB, text, thickness, color) {
		var edge = $(document.createElementNS(__svgNS__, "line"));
		var title = document.createElementNS(__svgNS__, "title");
		$(title).text(text);
		edge.append(title);
		edge.attr("x1", positionA.x);
		edge.attr("y1", positionA.y);
		edge.attr("x2", positionB.x);
		edge.attr("y2", positionB.y);
		edge.attr("stroke", color);
		edge.css({ strokeWidth: thickness });

		return edge;
	}
	
	var colors = {};
	
	//
	// Retorna uma cor aleatória
	//
	function randomColor() {
		var letters = '0123456789ABCDEF';
        var color = '';
        for (var i = 0; i < 6; i++)
            color += letters[Math.floor(Math.random() * letters.length)];

        return parseInt(color, 16);
	}
	
	//
	// Obtém a cor para um vértice
	//
	module.prototype.color = function(vx) {
		var outcoming = this.outcomingEdges(vx);
		
		if (this.incomingEdges(vx).length > outcoming.length)
		{
			if (colors[vx] == null)
				colors[vx] = randomColor();
			
			return colors[vx];
		}
		
		var c = 0;
		
		for (var i = 0; i < outcoming.length; i++)
			c += this.color(outcoming[i].dest);
		
		c /= outcoming.length;
		
		return c;
	};

	//
	// Desenha o grafo no SVG
	//
	module.prototype.render = function() {
		this._viewport.empty();

		var nodes = [], edges = [];
		var ox = 0, oy = 0;

		for (var i = 0; i < this._vertices.length; i++)
		{
			var 
				pos = this.position(this._vertices[i]), 
				size = this.size(this._vertices[i]);

			ox += pos.x;
			oy += pos.y;

			nodes.push(newCircle(pos, this._vertices[i], size, '#' + this.color(this._vertices[i]).toString(16)));
		}

		for (var i = 0; i < this._edges.length; i++)
		{
			var edge = this._edges[i];

			edges.push(
				newLine(
					this.position(edge.source), this.position(edge.dest), 
					edge.source + " -> " + edge.dest, 
					EDGE_BASE_THICKNESS, 
					EDGE_COLOR
				)
			);
		}

		for (var i = 0; i < edges.length; i++)
			this._viewport.append(edges[i]);

		for (var i = 0; i < nodes.length; i++)
			this._viewport.append(nodes[i]);

		this._svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
	};

	//
	// Propriedades
	//
	Object.defineProperties(module.prototype, {

		//
		// Largura do SVG
		//
		width: {
			get: function() {
				return this._svg.attr("width");
			},

			set: function(value) {
				this._svg.attr("width", value);
			}
		},

		//
		// Altura do SVG
		//
		height: {
			get: function() {
				return this._svg.attr("height");
			},

			set: function(value) {
				this._svg.attr("height", value);
			}
		},

		//
		// Zoom
		//
		scale: {
			get: function() {
				var transform = this._viewport.attr("transform").replace(/ /g,"");
				var vector = transform.substring(transform.indexOf("(") + 1, transform.indexOf(")")).split(",")

				return parseFloat(vector[0]);
			},

			set: function(value) {
				this._viewport.attr("transform", "scale(" + value + "," + value + ") translate(" + this.translation.x + "," + this.translation.y + ")");
			}
		},

		//
		// Translação
		//
		translation: {
			get: function() {
				var transform = this._viewport.attr("transform").replace(/ /g,"");
				var vector = transform.substring(transform.lastIndexOf("(") + 1, transform.lastIndexOf(")")).split(",")

				return { x: parseFloat(vector[0]), y: parseFloat(vector[1]) };
			},

			set: function(value) {
				this._viewport.attr("transform", "scale(" + this.scale + "," + this.scale + ") translate(" + value.x + "," + value.y + ")");
			}
		}
	});

})(ATPIN.Graph);