var ATPIN = {};

(function(module) {

    var __server__,
        __lastSearched__,
        __lastReceivedData__,
        __graph__;

    //
    // Envia uma requisição para o servidor
    //
    //  query       : Consulta enviada para o servidor
    //
    function sendRequest(query, onsuccess, onerror) {
        var ajaxSettings = {
            method: "POST",

            data: query,
            dataType: "text",

            success: onsuccess,
            error: onerror
        };

        if (!!__server__)
            $.ajax(__server__, ajaxSettings);
        else
            $.getJSON("server.json", function(data) {
                __server__ = location.protocol + "//" + data.address + ":" + data.port;
                $.ajax(__server__, ajaxSettings);
            });
    }

    //
    // Callback genérico de erro para o jQuery
    //
    function defaultError(xhr, ajaxOptions, thrownError) {
        var out     = $("#resultado"),
            status  = $("#status");
        out.text("");

        if (xhr.readyState == 0)
            status.text("Server unavailable. Try again later.");
        else
            switch (xhr.status) {
                case 500:
                    status.text("There were internal server errors. Ask a system administrator for further information.");
                    break;
                case 503:
                    status.text("The database is unavailable. Try again later.");
                    break;
                case 400:
                    if (thrownError == "Empty locus name") {
                        status.text("Protein name was empty.");
                        break;
                    }
                default:
                    status.text("Could not connect to server: " + thrownError);
            }
    }

    //
    // Requisita as interações de um locus para o servidor
    //
    //  locus       : Proteína a ser requisitada
    //
    function requestLocus(locus, onsuccess, onerror) {
        sendRequest("LOCUS " + locus, onsuccess, onerror);
    }

    //
    // Requisita informações de um interactoma para o servidor
    //
    //  locusA      : Proteína que foi requisitada inicialmente
    //  locusB      : Proteína que interage com ela
    //
    function requestInfo(locusA, locusB, onsuccess, onerror) {
        sendRequest("INFO " + locusA + " " + locusB, onsuccess, onerror);
    }

    //
    // Requisita um nome de proteína aleatório para o servidor
    //
    function requestRandom(onsuccess, onerror) {
        sendRequest("RANDOM", onsuccess, onerror);
    }

		//
		// Adiciona uma busca ao histórico
		//
		function addToHistory(query)
		{
			if (!window.localStorage)
				return;

			if (window.localStorage.history === undefined)
				window.localStorage.history = "";

			entries = window.localStorage.history.split("\0");

			var i = entries.indexOf(query);
			if (i >= 0)
				entries.splice(i, 1);

			entries.push(query);

			window.localStorage.history = entries.join("\0");
		}

    //
    // Procura um locus no banco de dados e mostra a lista de proteínas
    // que interagem com ele
    //
    module.searchSingle = function() {
        var out     = $("#result"),
            status  = $("#status"),
            input   = $("#proteina");

        out.text("");

        // Formata a entrada
        var locus = input.val().toUpperCase().trim();
        input.val(locus);

        // Valida a entrada, se estiver fora do padrão estabelecido
        // cancela a pesquisa e retorna erro
        if (!input[0].checkValidity()) {
            out.text("");
            status.text("Protein name can't be empty nor have white spaces");
            return;
        }

				addToHistory("S" + locus);

        __lastSearched__ = locus;

        status.text("Searching...");

				$("#expand-all").css({display: "inline"});
				$("#collapse-all").css({display: "inline"});
				$("#show-graph").css({display: "none"});
				$("#clear-history").css({display: "none"});

        var startTime = new Date().getTime();

        function success(data, textStatus, xhr) {

            var msElapsed = new Date().getTime() - startTime;

            out.text("");
            $("#expand-collapse").css({display: "none"});

            // Se o código de sucesso for 200 (OK), mostra o resultado na tela
            if (xhr.status == 200) {

                if (data == undefined) {
                    status.text("No interactions found for the given protein.");
                    return;
                }

                $("#expand-collapse").css({display: "block"});

                var result = data.split(",");
                __lastReceivedData__ = result;
                status.text(result.length + " results (" + msElapsed / 1000 + " seconds)");

                // Exibe a lista de resultados
                var ul = $("<ul class='list-group'></ul>");

                for (var i = 0; i < result.length; i++)
                {
                    var li = $("<li class='list-group-item'></li>");
                    li.append("<a class='glyphicon glyphicon-transfer search-pair' href='?locus=" + locus + "&other=" + result[i] + "'></a>");
                    li.append("<a href='?locus=" + result[i] + "' class='result-item'>" + result[i] + "</a>");
                    li.append("<span class='more glyphicon glyphicon-chevron-down' onclick='ATPIN.showDetails(" + i + ")'></span>");
                    li.append("<br>");
                    li.append("<div class='target'></div>");

                    ul.append(li);
                }

                out.append(ul);
            }

            // Se for 204 (NoContent), mostra um status de proteína não encontrada
            else if (xhr.status == 204) {

                status.text("The given protein could not be found on the database");

                if (sessionStorage.disableHint == "true") {

                    $("#hint").css({
                        display: "block"
                    });

                    $("body").css({
                        paddingBottom: "60px"
                    });

                    requestRandom(function(data) {
                        $("#hint-locus").text(data);
                        $("#hint-locus").attr("href", "?locus=" + data);
                    });

                    sessionStorage.disableHint = false;
                }
            }
        }

        requestLocus(locus, success, defaultError);
    };

    //
    // Procura as interações para dois locus e mostra o resultado na
    // forma de tabela
    //
    module.searchTwo = function() {

        var out     = $("#result"),
            status  = $("#status"),
            input1  = $("#proteina"),
            input2  = $("#proteina2");

        out.text("");

        // Formata e valida as duas entradas
        var a = input1.val().toUpperCase().trim();
        input1.val(a);

        var b = input2.val().toUpperCase().trim();
        input2.val(b);

        if (!(input1[0].checkValidity() && input2[0].checkValidity())) {
            out.text("");
            status.text("Protein name can't be empty nor have white spaces");
            return;
        }

				addToHistory("2" + a + "," + b);

				$("#expand-collapse").css({display: "block"});
				$("#expand-all").css({display: "none"});
				$("#collapse-all").css({display: "none"});
				$("#clear-history").css({display: "none"});

        status.text("Searching...");

        var startTime = new Date().getTime();

        __lastSearched__ = [a, b];

        // Objetos para armazenar as interações dos dois locus
        var dA = { locus: a };
        var dB = { locus: b, other: dA };
        dA.other = dB;

        function success(data)
        {
            var other = this.other;

            if (data == undefined)
            {
                status.text(this.locus + " could not be found on the database");
                return;
            }

            this.interactions = data.split(",");

            if (other.interactions != undefined)
            {
                __lastReceivedData__ = { a: this, b: other };

                var msElapsed = new Date().getTime() - startTime;

                $("#show-graph").css({display: "inline"});
                $("#show-graph").html("<a href='#' onclick='ATPIN.showGraph()'>Show Graph</a>");

                var all = [];

                // Cria uma lista de todas as proteínas que o par de locus procurados
                // interage sem repetições
                for (var i = 0; i < this.interactions.length; i++)
                    all.push(this.interactions[i]);

                for (var i = 0; i < other.interactions.length; i++)
                    if (all.indexOf(other.interactions[i]) < 0)
                        all.push(other.interactions[i]);

                // Mostra a tabela com os resultados
                var table = $("<table class='table table-responsive'></table>"),
                    thead = $("<thead></thead>"),
                    tbody = $("<tbody></tbody>");

                var headRow = $("<tr></tr>");
                headRow.append("<th></th>");
                headRow.append("<th>" + this.locus + "</th>");
                headRow.append("<th>" + other.locus + "</th>");

                thead.append(headRow);

                table.append(thead);

                for (var i = 0; i < all.length; i++)
                {
                    var interactsWithThis = this.interactions.indexOf(all[i]) >= 0;
                    var interactsWithOther = other.interactions.indexOf(all[i]) >= 0;

                    var row;

                    // Se uma interage com a outra, mostra a linha em azul
                    if (
                        (all[i] == this.locus && interactsWithOther) ||
                        (all[i] == other.locus && interactsWithThis)
                    )
                        row = $("<tr class='info'></tr>");

                    // Se uma delas interage com ela mesma, mostra em amarelo
                    else if (
                        (all[i] == this.locus && interactsWithThis) ||
                        (all[i] == other.locus && interactsWithOther)
                    )
                        row = $("<tr class='warning'></tr>");

                    // Se uma terceira proteína interage com as duas procuradas, mostra
                    // em verde
                    else if (interactsWithThis && interactsWithOther)
                        row = $("<tr class='success'></tr>");

                    // Se só interagir com uma das duas, mostra a linha normalmente
                    else
                        row = $("<tr></tr>");

                    row.append("<th>" + all[i] + "</th>");
                    row.append("<td><span class='glyphicon " + (interactsWithThis ? "glyphicon-ok" : "glyphicon-remove") + "'></span></td>");
                    row.append("<td><span class='glyphicon " + (interactsWithOther ? "glyphicon-ok" : "glyphicon-remove") + "'></span></td>");

                    tbody.append(row);
                }

                table.append(tbody);

                var b = $("<ul class='list-group'></ul>"), c = $("<li class='list-group-item'></li>");
                b.append(c);
                c.append(table);
                out.append(b);
                status.text(all.length + " results (" + msElapsed / 1000 + " seconds)");
            }
        }

        requestLocus(a, success.bind(dA), defaultError);
        requestLocus(b, success.bind(dB), defaultError);
    };

    //
    // Mostra as informações para uma interação
    //
    module.showDetails = function(i) {
        var item    = $($(".result-item")[i]),
            div     = $(item).parent().find(".target"),
            btn     = $(item).parent().find(".more");

        if (!div.is(":visible")) {
            if (div.text() == "")
                requestInfo(__lastSearched__, item.text(), function(data, textStatus, xhr) {

                    // Se o código de retorno foi 200 (OK), mostra as informações
                    if (xhr.status == 200)
                    {
                        var info = JSON.parse(data);
                        var table = $("<table class='table table-responsive'></table>"),
                            thead = $("<thead></thead>"),
                            tbody = $("<tbody></tbody>");

                        var headerRow = $("<tr></tr>");
                        headerRow.append("<th>Method</th>");
                        headerRow.append("<th>FSW</th>");
                        headerRow.append("<th>C3</th>");
                        headerRow.append("<th>Description</th>");

                        thead.append(headerRow);
                        table.append(thead);

                        var bodyRow     = $("<tr></tr>"),
                            methodCol   = $("<td></td>"),
                            methodList  = $("<ul></ul>");

                        for (var i = 0; i < info.method.length; i++)
                            methodList.append("<li>" + info.method[i] + "</li>");
                        methodCol.append(methodList);
                        bodyRow.append(methodCol);

                        bodyRow.append("<td>" + info.fsw + "</td>");
                        bodyRow.append("<td>" + info.local + "</td>");
                        bodyRow.append("<td>" + info.description.toUpperCase() + "</td>");

                        tbody.append(bodyRow);
                        table.append(tbody);

                        div.append(table);

                    }

                    // Se não, Houston we have a problem
                    else {
                        div.append("<span class='error text-danger'>There's nothing about this interaction on the database.</span><br>");
                        div.append("That might be a bug, contact a system administrator for further information.");
                    }

                }, defaultError);

            div.removeClass("collapsed").addClass("expanded")
            btn.removeClass("unrotated").addClass("rotated");
        } else {
            btn.removeClass("rotated").addClass("unrotated");
            div.removeClass("expanded").addClass("collapsed");
        }
    };

    //
    // Mostra as informações de todas as interações
    //
    module.expandAll = function() {
        $(".result-item").each(module.showDetails);
        $(".result-item").parent().find(".target").removeClass("collapsed").addClass("expanded")
        $(".more").removeClass("unrotated").addClass("rotated");
    };

    //
    // Fecha as informações de todas as interações
    //
    module.collapseAll = function() {
        $(".result-item").parent().find(".target").removeClass("expanded").addClass("collapsed");
        $(".more").removeClass("rotated").addClass("unrotated");
    };

    //
    // Fecha a janela de dica de proteína
    //
    module.closeHint = function() {
        sessionStorage.disableHint = true;
        $("body").css({ paddingBottom: "0px" });
    };

    //
    // Mostra as interações da proteína na forma de grafo
    //
    module.showGraph = function() {
        var out = $("#result"),
            status  = $("#status");

        out.text("");
        status.text("");

        var svg = $("<svg style='background-color: #fff' id='graph' width='960' height='640'></svg>");
        out.append(svg);

        __graph__ = new ATPIN.Graph(svg);

        svg.bind('mousewheel DOMMouseScroll', mouseWheelHandler);

        var a = __lastReceivedData__.a;
        var b = __lastReceivedData__.b;

        __graph__.addVertex(a.locus);
        __graph__.addVertex(b.locus);

        for (var i = 0; i < a.interactions.length; i++)
        {
            var p = a.interactions[i];

            if (p == b.locus || p == a.locus)
                continue;

            __graph__.addVertex(p);
            __graph__.addEdge(p, a.locus);
        }

        for (var i = 0; i < b.interactions.length; i++)
        {
            var p = b.interactions[i];

            if (p == b.locus || p == a.locus)
                continue;

            if (!a.interactions.some(function(c) { return c == p; }))
                __graph__.addVertex(p);

            __graph__.addEdge(p, b.locus);
        }

        __graph__.addEdge(a.locus, b.locus);
        __graph__.render();

        svg.attr("width", "100%");
        svg.attr("height", "100%");

        var mousedown = false, cx = 0, cy = 0;

        svg.bind("mousedown", function(e) {
            mousedown = true;
            cx = e.clientX;
            cy = e.clientY;

            svg.css("cursor", "move");
        })
        .bind("mouseup mouseout", function(e) {
            mousedown = false;
            svg.css("cursor", "default");
        })
        .bind("mousemove", function(e) {
            if (!mousedown)
                return;

            var dx = cx - e.clientX, dy = cy - e.clientY;

            cx = e.clientX;
            cy = e.clientY;

            var translation = __graph__.translation;
            __graph__.translation = { x: translation.x - dx, y: translation.y - dy };
        });

        $("#show-graph").html("<a href='#' onclick='ATPIN.searchTwo()'>Show Table</a>");
    };

		//
		// Mostra o histórico de busca
		//
		module.showHistory = function() {
			var out = $("#result"),
					status  = $("#status");

			out.text("");
			status.text("");

			$("#expand-collapse").css({display: "block"});
			$("#expand-all").css({display: "none"});
			$("#collapse-all").css({display: "none"});
			$("#show-graph").css({display: "none"});
			$("#clear-history").css({display: "inline"});

			if (!window.localStorage)
			{
				status.text("Search history is not available on your browser, try enabling cookies and/or updating your browser.");
				return;
			}

			if (!window.localStorage.history)
			{
				status.html("<center>Nothing here, try searching for something!</center>");
				return;
			}

			var ul = $("<ul class='list-group'></ul>");

			var entries = window.localStorage.history.split("\0");
			for (var i = entries.length - 1; i >= 0; i--)
			{
				var li = $("<li class='list-group-item'></li>");
				var entry = entries[i];

				if (entry[0] == 'S')
					li.append("<a href='?locus=" + entry.substring(1) + "' class='result-item'>" + entry.substring(1) + "</a>");
				else if (entry[0] == '2')
				{
					var parts = entry.substring(1).split(',');
					li.append("<a href='?locus=" + parts[0] + "&other=" + parts[1] + "' class='result-item'>" + parts[0] + " - " + parts[1] + "</a>");
				}
				else
					continue;

				ul.append(li);
			}

			out.append(ul);
		}

		//
		// Limpa o histórico de busca
		//
		module.clearHistory = function() {
			window.localStorage.history = "";
			module.showHistory();
		}

    //
    // Controlador para zoom com a roda do mouse
    //
    function mouseWheelHandler(e) {
        var evt = window.event || e;
        var scroll = evt.detail ? evt.detail * 0.05 : (evt.wheelDelta / 120) * 0.05;

        if ((scroll < 0 && __graph__.scale < 0.1) || (scroll > 0 && __graph__.scale > 4.0))
            return;

        __graph__.scale += scroll;

        e.preventDefault();

        return true;
    }

    //
    // Evento de edição do input de pesquisa
    //
    function pesquisaEdited() {
        var input = $("#proteina");
        var submit = $("#submit");
        var more= $("#moreLocus");
        var locus = input.val().trim();

        if (!input[0].checkValidity())
            input.parent().addClass("has-error");
        else
            input.parent().removeClass("has-error");

        if (locus == "")
        {
            submit.attr("disabled", true);
            more.attr("disabled", true);
        }
        else
        {
            submit.removeAttr("disabled");
            more.removeAttr("disabled");
        }
    }

    //
    // Evento de edição do input de pesquisa da segunda proteína
    //
    function pesquisa2Edited() {
        var input = $("#proteina2");
        var submit = $("#submit2");
        var locus = input.val().trim();

        if (!input[0].checkValidity())
            input.parent().addClass("has-error");
        else
            input.parent().removeClass("has-error");

        if (locus == "")
            submit.attr("disabled", true);
        else
            submit.removeAttr("disabled");
    }

    //
    // Evento de carregamento finalizado no documento
    //
    $(document).ready(function() {
        $("#proteina").on('input', pesquisaEdited);
        $("#proteina2").on('input', pesquisa2Edited);

        // Procura um locus usando a query string da URL
        var locus, other;

        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == 'locus')
                locus = decodeURIComponent(pair[1]);
            else if (decodeURIComponent(pair[0]) == 'other')
                other = decodeURIComponent(pair[1]);
        }

        if (!!locus)
        {
            if (!!other)
            {
                $("#proteina").val(locus);
                $("#proteina2").val(other);
                pesquisaEdited();
                pesquisa2Edited();
                module.searchTwo();
            }
            else
            {
                $("#proteina").val(locus);
                pesquisaEdited();
                module.searchSingle();
            }
        }

        // Mostra a janela de dica
        if (sessionStorage.disableHint != "true")
        {
            $("#hint").css({display: "block"});
            $("body").css({paddingBottom: "60px"});

            requestRandom(function(data) {
                $("#hint-locus").text(data);
                $("#hint-locus").attr("href", "?locus=" + data);
            });
        }
    });
})(ATPIN);
