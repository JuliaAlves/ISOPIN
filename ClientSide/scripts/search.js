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

    // Configurações da requisição do AJAX
    requestLocus(locus,
    // Callback de sucesso
    function(data, textStatus, xhr) {
        var endTime = new Date().getTime();
        out.text("");

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
                out.append("<li class='list-group-item'><a href='?locus=" + result[i] + "' class='result-item'>" + result[i] + "</a>" + "<span class='more glyphicon glyphicon-chevron-down' onclick='detalhes(" + i + ")'></span><br><div class='target'></div></li>");

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

// Mostra as informações para uma interação
function detalhes(i) {
    var input = $("#proteina");
    var locus = input.val().toUpperCase().trim();

    var item = $(".result-item")[i];
    var div = $(item).parent().find(".target");

    if (!div.is(":visible")) {
        if (div.text() == "")
            requestInfo(locus, item.text, function(data, textStatus, xhr) {
                if (xhr.status == 200)
                    div.text(data);
                else {
                    div.append("<span class='error text-danger'>There's nothing about this interaction on the database.</span><br>");
                    div.append("That might be a bug, contact a system administrator for further information.");
                }

                div.css({
                    display: "block"
                });
            }, erro);
        else
            div.css({
                display: "block"
            });
    } else
        div.css({
            display: "none"
        });
}

// Mostra as informações de todas as interações
function expandAll() {
    $(".result-item").each(detalhes);
    $(".result-item").parent().find(".target").css({
        display: "block"
    });
}

// Fecha as informações de todas as interações
function collapseAll() {
    $(".result-item").parent().find(".target").css({
        display: "none"
    });
}

// Procura um locus usando a query string
$(document).ready(function() {
    $("#proteina").on('input', pesquisaEdited);

    var locus;

    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == 'locus') {
            locus = decodeURIComponent(pair[1]);
            break;
        }
    }

    if (!!locus) {
        $("#proteina").val(locus);
        pesquisaEdited();
        Procurar(locus);
    }
});
