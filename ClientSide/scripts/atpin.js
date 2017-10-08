var ATPIN = {};

(function(module) {

    var __server__,
        __lastSearched__,
        __lastReceivedData__,
        __graph__,
        __pageChanged__;

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
    function requestLocus(locus, page, onsuccess, onerror) {
        sendRequest("LOCUS " + page + " " + locus, onsuccess, onerror);
    }

    //
    // Requisita o número de páginas para uma pesquisa para o servidor
    //
    //  method  : Método de pesquisa
    //  param   : Parâmetro da pesquisa
    //
    function requestNumberOfPages(method, param, onsuccess, onerror) {
        sendRequest(method + " PageCount " + param, onsuccess, onerror);
    }

    //
    // Requisita uma lista das proteínas cujas descrições batem com uma
    // pesquisa
    //
    //  desc       : Descrição a ser pesquisada
    //  page       : Página
    //
    function requestSearchByDescription(desc, page, onsuccess, onerror){
        sendRequest("QDESC " + page + " " + desc, onsuccess, onerror);
    }

    //
    // Requisita uma lista das interações cujos C3 coincidam com uma pesquisa
    //
    //  c3          : C3 a ser pesquisado
    //  page        : Página
    //
    function requestSearchByC3(c3, page, onsuccess, onerror){
        sendRequest("QC3 " + page + " " + c3, onsuccess, onerror);
    }

    //
    // Requisita uma lista das interações cujos métodos de previsão batam com
    // uma pesquisa
    //
    //  method        : Método a ser pesquisado
    //  page          : Página
    //
    function requestSearchByMethod(method, page, onsuccess, onerror){
        sendRequest("QM " + page + " " + method, onsuccess, onerror);
    }

    //
    // Requisita a descrição de uma proteína
    //
    //  locus       : Proteína
    //
    function requestDescription(locus, onsuccess, onerror){
        sendRequest("DESC " + locus, onsuccess, onerror);
    }

    //
    // Requisita o C3 de uma interação
    //
    //  locusA      : Proteína A
    //  locusB      : Proteína B
    //
    function requestC3(locusA, locusB, onsuccess, onerror){
        sendRequest("C3 " + locusA + " " + locusB, onsuccess, onerror);
    }

    //
    // Requisita o método de previsão de uma interação
    //
    //  locusA      : Proteína A
    //  locusB      : Proteína B
    //
    function requestMethod(locusA, locusB, onsuccess, onerror){
        sendRequest("M " + locusA + " " + locusB, onsuccess, onerror);
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
	function addToHistory(query) {
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
    // Habilita uma opção
    //
    function enableOptions() {
        for (var i = 0; i < arguments.length; i++)
            $("#" + arguments[i]).css({display: "block"});  
    }

    //
    // Habilita uma opção
    //
    function enableOptionsInline() {
        for (var i = 0; i < arguments.length; i++)
            $("#" + arguments[i]).css({display: "inline"});  
    }

    //
    // Habilita uma opção
    //
    function disableOptions() {
        for (var i = 0; i < arguments.length; i++)
            $("#" + arguments[i]).css({display: "none"});  
    }

    //
    // Deixa tudo pronto para começar uma pesquisa
    //
    module.setupSearch = function(page) {
    	disableOptions(
            "expand-all", "collapse-all", "show-graph", 
            "clear-history", "pages"
        );

        $("#result").text("");
        $("#status").text("Searching...");

        $("#pages")[0].selectedIndex = page - 1;
    }

    //
    // Executa uma pesquisa pelo campo selecionado na barra de busca
    //
    module.search = function() {
        var opt = $("#select"), input = $("#search").val();

        switch (opt[0].selectedIndex)
        {
            default:
                window.history.pushState({}, "", "?t=0&prot=" + input);
                module.searchByName(input);
                break;

            case 2:
                window.history.pushState({}, "", "?t=4&desc=" + input);
                module.searchByDescription(input);
                break;

            case 3:
                window.history.pushState({}, "", "?t=1&m=" + input);
                module.searchByMethod(input);
                break;

            case 4:
                window.history.pushState({}, "", "?t=3&c3=" + input);
                module.searchByC3(input);
                break;
        }
    };

    //
   	// Mostra as páginas
   	//
    function showPages(n) {
    	$("#pages").empty();
        var pageCount = parseInt(n);
        for (var i = 1; i <= n; i++)
        	$("#pages").append("<option value='" + i + "'>" + i + "</option>");
    }

    //
    // Evento de alteração de página
    //
    function pageChanged() {
        var p = parseInt($("#pages").val());
    	if (__pageChanged__)
    		__pageChanged__(p);

        window.history.pushState({}, "", ('' + window.location).replace(/&p=\d+/g, '') + "&p=" + p);
    };

    //
    // Procura as proteínas que tenham descrições que batam com a pesquisada
    //
    module.searchByDescription = function(description, page) {
        module.setupSearch(page);

        var out  = $("#result"),
            status  = $("#status");

        addToHistory("D" + description);

    	if (!page)
        {
	        requestNumberOfPages("QDESC", description, showPages, defaultError);
	        __pageChanged__ = function(p) { module.searchByDescription(description, p); };
	    }

        var startTime = new Date().getTime();
        requestSearchByDescription(description, page || 1, function(data, textStatus, xhr) {
            var msElapsed = new Date().getTime() - startTime;
            enableOptions("pages");

            out.text("");

            // Se o código de sucesso for 200 (OK), mostra o resultado na tela
            if (xhr.status == 200) {

                if (data == undefined) {
                    status.text("No protein matches the description you are looking for.");
                    return;
                }

                var result = data.split(",");

                // Exibe a lista de resultados
                var ul = $("<ul class='list-group'></ul>");
                out.append(ul);

                for (var i = 0; i < result.length; i++)
                {
                    var li = $("<li class='list-group-item'></li>");
                    li.append("<a href='?t=0&prot=" + result[i] + "' class='result-item'>" + result[i] + "</a>");
                    li.append("<br><br>");

                    (function(desc) {
                        li.append(desc);

                        requestDescription(result[i],
                            function(data) {
                                var index = data.search(new RegExp(description, "gi"));
                                desc.text(data.substring(0, index));
                                desc.append("<mark>" + data.substring(index, index + description.length) + "</mark>");
                                desc.append(data.substring(index + description.length));
                            },

                            function() {
                                desc.text("Failed to fetch protein description from server")
                            }
                        );
                    })($("<span><span class='text-muted'>Loading...</span></span>"));

                    ul.append(li);
                }

                status.text(result.length + " results (" + msElapsed / 1000 + " seconds)");
            }

            // Se for 204 (NoContent), mostra um status de proteína não encontrada
            else if (xhr.status == 204)
                status.text("No protein matches the description you are looking for.");

        }, defaultError);
    };

    //
    // Procura as interações que tenham sido preditas pelo método pesquisado
    //
    module.searchByMethod = function(method, page) {
        module.setupSearch(page);

        var out  = $("#result"),
            status  = $("#status");

        addToHistory("M" + method);

        if (!page)
        {
	        requestNumberOfPages("QM", method, showPages, defaultError);
	        __pageChanged__ = function(p) { module.searchByMethod(method, p); };
	    }

        var startTime = new Date().getTime();
        requestSearchByMethod(method, page || 1, function(data, textStatus, xhr) {

            var msElapsed = new Date().getTime() - startTime;
            enableOptions("pages");

            out.text("");

            // Se o código de sucesso for 200 (OK), mostra o resultado na tela
            if (xhr.status == 200) {

                if (data == undefined) {
                    status.text("No matches were found on the database for the given method.");
                    return;
                }

                var result = data.split(",");
                __lastReceivedData__ = result;
                status.text(result.length + " results (" + msElapsed / 1000 + " seconds)");

                // Exibe a lista de resultados
                var ul = $("<ul class='list-group'></ul>");

                for (var i = 0; i < result.length; i++)
                {
                    var li = $("<li class='list-group-item'></li>");
					var parts = result[i].split(':');
                    li.append("<a href='?t=0&prot=" + parts[0] + "' class='result-item'>" + parts[0] + "</a>");
					li.append("<span class='text-muted'> | </span>");
					li.append("<a href='?t=0&prot=" + parts[1] + "' class='result-item'>" + parts[1] + "</a>");
                    li.append("<br>");

                    (function(m) {
                        li.append(m);

                        requestMethod(parts[0], parts[1],
                            function(data) {
								data = data.replace(/\|/g, '<br>');
                                var index = data.search(new RegExp(method, "gi"));
                                m.html(data.substring(0, index));
                                m.append("<mark>" + data.substring(index, index + method.length) + "</mark>");
                                m.append(data.substring(index + method.length));
                            },

                            function() {
                                m.text("Failed to fetch interaction prediction method from server")
                            }
                        );
                    })($("<span>Loading...</span>"));

                    ul.append(li);
                }

                out.append(ul);
            }

            // Se for 204 (NoContent), mostra um status de proteína não encontrada
            else if (xhr.status == 204)
                status.text("No interaction matches the method you are looking for.");

        }, defaultError);
    };

    //
    // Procura as interações cujo C3 seja semelhante ao pesquisado
    //
    module.searchByC3 = function(c3, page) {
        module.setupSearch(page);

        var out  = $("#result"),
            status  = $("#status");

        addToHistory("C" + c3);

        if (!page)
        {
	        requestNumberOfPages("QC3", c3, showPages, defaultError);
	        __pageChanged__ = function(p) { module.searchByC3(c3, p); };
	    }

        var startTime = new Date().getTime();
        requestSearchByC3(c3, page || 1, function(data, textStatus, xhr) {
            var msElapsed = new Date().getTime() - startTime;
            enableOptions("pages");

            out.text("");

            // Se o código de sucesso for 200 (OK), mostra o resultado na tela
            if (xhr.status == 200) {

                if (data == undefined) {
                    status.text("No matches were found on the database for the given c3.");
                    return;
                }

                var result = data.split(",");
                __lastReceivedData__ = result;
                status.text(result.length + " results (" + msElapsed / 1000 + " seconds)");

                // Exibe a lista de resultados
                var ul = $("<ul class='list-group'></ul>");

                for (var i = 0; i < result.length; i++)
                {
                    var li = $("<li class='list-group-item'></li>");
                    var parts = result[i].split(':');
                    li.append("<a href='?t=0&prot=" + parts[0] + "' class='result-item'>" + parts[0] + "</a>");
                    li.append("<span class='text-muted'> | </span>");
                    li.append("<a href='?t=0&prot=" + parts[1] + "' class='result-item'>" + parts[1] + "</a>");
                    li.append("<br>");

                    (function(m) {
                        li.append(m);

                        requestC3(parts[0], parts[1],
                            function(data) {
                                var index = data.search(new RegExp(c3, "gi"));
                                m.html(data.substring(0, index));
                                m.append("<mark>" + data.substring(index, index + c3.length) + "</mark>");
                                m.append(data.substring(index + c3.length));
                            },

                            function() {
                                m.text("Failed to fetch interaction prediction method from server")
                            }
                        );
                    })($("<span>Loading...</span>"));

                    ul.append(li);
                }

                out.append(ul);
            }

            // Se for 204 (NoContent), mostra um status de proteína não encontrada
            else if (xhr.status == 204)
                status.text("No interaction matches the C3 you are looking for.");

        }, defaultError);
    };

    //
    // Procura um locus no banco de dados e mostra a lista de proteínas
    // que interagem com ele
    //
    module.searchByName = function(locus, page) {
        module.setupSearch(page);

        var out     = $("#result"),
            status  = $("#status");

        locus = locus.toUpperCase().trim();

		addToHistory("S" + locus);

        __lastSearched__ = locus;

        if (!page)
        {
        	requestNumberOfPages("LOCUS", locus, showPages, defaultError);
	        __pageChanged__ = function(p) { module.searchByName(locus, p); };
	    }

        var startTime = new Date().getTime();

        function success(data, textStatus, xhr) {
            var msElapsed = new Date().getTime() - startTime;

            enableOptionsInline("expand-all", "collapse-all");
            enableOptions("pages");

            out.text("");

            // Se o código de sucesso for 200 (OK), mostra o resultado na tela
            if (xhr.status == 200) {

                if (data == undefined) {
                    status.text("No interactions found for the given protein.");
                    return;
                }

                enableOptions("expand-collapse");

                var result = data.split(",");
                __lastReceivedData__ = result;
                status.text(result.length + " results (" + msElapsed / 1000 + " seconds)");

                // Exibe a lista de resultados
                var ul = $("<ul class='list-group'></ul>");

                for (var i = 0; i < result.length; i++)
                {
                    var li = $("<li class='list-group-item'></li>");
                    li.append("<a class='glyphicon glyphicon-transfer search-pair' href='?locus=" + locus + "&other=" + result[i] + "'></a>");
                    li.append("<a href='?t=0&prot=" + result[i] + "' class='result-item'>" + result[i] + "</a>");
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
                        $("#hint-locus").attr("href", "?t=0&prot=" + data);
                    });

                    sessionStorage.disableHint = false;
                }
            }
        }

        requestLocus(locus, page || 1, success, defaultError);
    };

    //
    // Procura as interações para dois locus e mostra o resultado na
    // forma de tabela
    //
    module.searchTwo = function(a, b) {
        var out     = $("#result"),
            status  = $("#status");

		addToHistory("2" + a + "," + b);
        enableOptions("expand-collapse");

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
	module.showHistory = function(page) {
		var out = $("#result"),
				status  = $("#status");

		out.text("");
		status.text("");

        enableOptions("expand-collapse");
        enableOptionsInline("clear-history");
        disableOptions("expand-all", "collapse-all", "show-graph", "pages");

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
        __pageChanged__ = function(p) { console.log(p); module.showHistory(p); };
        if (!page)
            showPages(Math.ceil(entries.length / 50));
        enableOptions("pages");

        page = page || 1;

		for (var i = (page - 1) * 50; i < entries.length && i < page * 50; i++)
        {
			var li = $("<li class='list-group-item'></li>");
			var entry = entries[entries.length - 1 - i];

			if (entry[0] == 'S')
				li.append("<tr><td style='width: 100%'><a href='?t=0&prot=" + entry.substring(1) + "' class='result-item'>" + entry.substring(1) + "</a></td><td class='text-muted text-right'>Name</td></tr>");
			else if (entry[0] == '2')
			{
				var parts = entry.substring(1).split(',');
				li.append("<tr><td style='width: 100%'><a href='#' onclick='ATPIN.searchTwo(\"" + parts[0] + "\", \"" + parts[1] + "\")' class='result-item'>" + parts[0] + " - " + parts[1] + "</a></td><td class='text-muted text-right'>Pair</td></tr>");
			}
            else if (entry[0] == 'D')
                li.append("<tr><td style='width: 100%'><a href='?t=4&desc=" + entry.substring(1) + "' class='result-item'>" + entry.substring(1) + "</a></td><td class='text-muted text-right'>Description</td></tr>");
            else if (entry[0] == 'M')
                li.append("<tr><td style='width: 100%'><a href='?t=2&m=" + entry.substring(1) + "' class='result-item'>" + entry.substring(1) + "</a></td><td class='text-muted text-right'>Method</td></tr>");
            else if (entry[0] == 'C')
                li.append("<tr><td style='width: 100%'><a href='?t=3&c3=" + entry.substring(1) + "' class='result-item'>" + entry.substring(1) + "</a></td><td class='text-muted text-right'>C3</td></tr>");
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
        var input = $("#search"),
            submit = $("#submit"),
            more = $("#moreLocus");

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
    // Processa os dados passados por GET pela URL
    //
    function parseGETData(params) {
        switch (parseInt(params["t"]))
        {
            case 0:
                module.searchByName(params["prot"], params["p"]);
                break;

            case 1:
                module.searchByName(params["name"], params["p"]);
                break;

            case 2:
                module.searchByMethod(params["m"], params["p"]);
                break;

            case 3:
                module.searchByC3(params["c3"], params["p"]);
                break;

            case 4:
                module.searchByDescription(params["desc"], params["p"]);
                break;
        }
    }

    //
    // Evento de carregamento finalizado no documento
    //
    $(document).ready(function() {

        var input = $("#search");

        input.on('input', pesquisaEdited);
        $("#pages").on('change', pageChanged);

        // Mostra a janela de dica
        if (sessionStorage.disableHint != "true")
        {
            $("#hint").css({display: "block"});
            $("body").css({paddingBottom: "60px"});

            requestRandom(function(data) {
                $("#hint-locus").text(data);
                $("#hint-locus").attr("href", "?t=0&prot=" + data);
            });
        }

        // Processa os dados de GET da URL
        (window.onpopstate = function () {
            var match,
                pl     = /\+/g,  // Regex for replacing addition symbol with a space
                search = /([^&=]+)=?([^&]*)/g,
                decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
                query  = window.location.search.substring(1),
                urlParams = {};

            while (match = search.exec(query))
               urlParams[decode(match[1])] = decode(match[2]);

           parseGETData(urlParams);
        })();
    });
})(ATPIN);
