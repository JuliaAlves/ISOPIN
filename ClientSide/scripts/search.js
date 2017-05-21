var __server__;

// Envia uma requisição para o servidor
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
            __server__ = "http://" + data.address + ":" + data.port;
            $.ajax(__server__, ajaxSettings);
        });
}

// Callback de erro
function erro(xhr, ajaxOptions, thrownError) {
    var out = $("#resultado");
    var status = $("#status");
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

// Requisita um locus para o servidor
function requestLocus(locus, onsuccess, onerror) {
    sendRequest("LOCUS " + locus, onsuccess, onerror);
}

// Requisita informações de um interactoma para o servidor
function requestInfo(locusA, locusB, onsuccess, onerror) {
    sendRequest("INFO " + locusA + " " + locusB, onsuccess, onerror);
}

// Requisita um nome de proteína aleatório
function requestRandom(onsuccess, onerror) {
    sendRequest("RANDOM", onsuccess, onerror);
}

// Evento de edição do input de pesquisa
function pesquisaEdited() {
    var input = $("#proteina");
    var submit = $("#submit");
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

// Procura um locus no banco de dados e mostra o resultado
function Procurar() {
    var out = $("#resultado");
    var status = $("#status");

    var input = $("#proteina");
    var locus = input.val().toUpperCase().trim();
    input.val(locus);

    if (!input[0].checkValidity()) {
        out.text("");
        status.text("Protein name can't be empty nor have white spaces");
        return;
    }

    status.text("Searching...");

    var startTime = new Date().getTime();

    requestLocus(locus,
	
    // Callback de sucesso
    function(data, textStatus, xhr) {
        var endTime = new Date().getTime();
        out.text("");
        $("#expand-collapse").css({display: "none"});

        var str = data;

        if (xhr.status == 200) {
            if (str == undefined) {
                status.text("No interactions found for the given protein.");
                return;
            }

			$("#expand-collapse").css({display: "block"});

            var result = str.split(",");
			status.text(result.length + " results (" + (endTime - startTime) / 1000 + " seconds)");

            for (var i = 0; i < result.length; i++)
                out.append("<li class='list-group-item'><a href='?locus=" + result[i] + "' class='result-item'>" + result[i] + "</a>" + "<span class='more glyphicon glyphicon-chevron-down' onclick='MostrarDetalhes(" + i + ")'></span><br><div class='target'></div></li>");

        } else if (xhr.status == 204) {
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
    },
	
    erro);
}

// Procura as interações para dois locus e mostra o resultado na
// forma de tabela
function ProcurarDois(a, b) {
    var out = $("#resultado");
    var status = $("#status");

    status.text("Searching...");

    var startTime = new Date().getTime();

	var dA = { locus: a };
	var dB = { locus: b, other: dA };
	dA.other = dB;
	
	function sucesso(data)
	{
		var other = this.other;
		
		this.interactions = data;
		
		if (other.interactions != undefined)
		{
			var iA = this.interactions.split(",");
			var iB = other.interactions.split(",");
			var all = [];
			
			for (var i = 0; i < iA.length; i++)
				all.push(iA[i]);
			
			for (var i = 0; i < iB.length; i++)
				if (all.indexOf(iB[i]) < 0) 
					all.push(iB[i]);
			
			s = "";
			s += "<thead><tr>";
			s += "<th></th>";
			s += "<th>" + this.locus + "</th>";
			s += "<th>" + other.locus + "</th>";
			s += "</tr></thead><tbody>";
			
			for (var i = 0; i < all.length; i++)
			{
				var interactsWithA = iA.indexOf(all[i]) >= 0;
				var interactsWithB = iB.indexOf(all[i]) >= 0;
				
				
				if (
					(all[i] == this.locus && interactsWithB) || 
					(all[i] == other.locus && interactsWithA)
				)
					s += "<tr class='info'>";
				else if (
					(all[i] == this.locus && interactsWithA) || 
					(all[i] == other.locus && interactsWithB)
				)
					s += "<tr class='warning'>";
				else if (interactsWithA && interactsWithB)
					s += "<tr class='success'>";
				else
					s += "<tr>";
				s += "<th>" + all[i] + "</th>";
				s += "<td><span class='glyphicon " + (interactsWithA ? "glyphicon-ok" : "glyphicon-remove") + "'></span></td>";
				s += "<td><span class='glyphicon " + (interactsWithB ? "glyphicon-ok" : "glyphicon-remove") + "'></span></td>";
				s += "</tr>";
			}
			
			s += "</tbody>";
			
			out.html(s);
			status.text(all.length + " results (" + (new Date().getTime() - startTime) / 1000 + " seconds)");
		}
	}
	
    requestLocus(a, sucesso.bind(dA), erro);
    requestLocus(b, sucesso.bind(dB), erro);
}

// Mostra as informações para uma interação
function MostrarDetalhes(i) {
    var input = $("#proteina");
    var locus = input.val().toUpperCase().trim();

    var item = $(".result-item")[i];
    var div = $(item).parent().find(".target");
    var btn = $(item).parent().find(".more");

    if (!div.is(":visible")) {
        if (div.text() == "")
            requestInfo(locus, item.text, function(data, textStatus, xhr) {
                if (xhr.status == 200)
                {
                	console.log(data);
                	var info = JSON.parse(data);
                	var table = "";
                	table += "<table class='table table-responsive'>";
                    table += "<thead><tr><th>Method</th><th>FSW</th><th>C3</th><th>Description</th></tr></thead>";
                    table += "<tbody><tr>";

                    table += "<td>"
                    table += "<ul>";
                    for (var i = 0; i < info.method.length; i++)
                    	table += "<li>" + info.method[i] + "</li>";
                    table += "</ul>";
                    table += "</td>";

                    table += "<td>" + info.fsw + "</td>";
                    table += "<td>" + info.local + "</td>";
                    table += "<td>" + info.description.toUpperCase() + "</td>";
                    table += "</tr></tbody>";
                    table += "</table>";

                    div.html(table);
                } else {
                    div.append("<span class='error text-danger'>There's nothing about this interaction on the database.</span><br>");
                    div.append("That might be a bug, contact a system administrator for further information.");
                }
            }, erro);

        div.removeClass("collapsed").addClass("expanded")
        btn.removeClass("unrotated").addClass("rotated");
    } else {
    	btn.removeClass("rotated").addClass("unrotated");
        div.removeClass("expanded").addClass("collapsed");
    }
}

// Mostra as informações de todas as interações
function expandAll() {
    $(".result-item").each(MostrarDetalhes);
    $(".result-item").parent().find(".target").removeClass("collapsed").addClass("expanded")
    $(".more").removeClass("unrotated").addClass("rotated");
}

// Fecha as informações de todas as interações
function collapseAll() {
    $(".result-item").parent().find(".target").removeClass("expanded").addClass("collapsed");
    $(".more").removeClass("rotated").addClass("unrotated");
}

// Procura um locus usando a query string
$(document).ready(function() {
    $("#proteina").on('input', pesquisaEdited);

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

    if (!!locus) {
		if (!!other)
			ProcurarDois(locus, other);
		else
		{
			$("#proteina").val(locus);
			pesquisaEdited();
			Procurar();
		}
    }
});
